const crypto = require('node:crypto');

const EVENT_WEIGHTS = {
  MEET_ATTENDED: 40,
  DUES_PAID: 25,
  NOTICE_POSTED: 20,
  MEET_RSVP: 10,
  CHAT_MESSAGE: 5
};

const DECAY_RATE = 0.05; // Exponential decay over days

/**
 * Record an activity event in the database
 */
function recordActivityEvent(db, userId, societyId, type) {
  const weight = EVENT_WEIGHTS[type] || 5;
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO activity_events (id, user_id, society_id, type, weight, occurred_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, userId, societyId, type, weight);

  // Recalculate member's score and check title rules
  recalculateMemberActivity(db, userId, societyId);
}

/**
 * Recalculate member's 30-day decaying activity score and update status & titles
 */
function recalculateMemberActivity(db, userId, societyId) {
  const events = db.prepare(`
    SELECT type, weight, occurred_at,
           (julianday('now') - julianday(occurred_at)) AS days_ago
    FROM activity_events
    WHERE user_id = ? AND society_id = ? AND julianday('now') - julianday(occurred_at) <= 30
  `).all(userId, societyId);

  let totalScore = 0;
  events.forEach(ev => {
    // Exponential decay formula: W * e^(-lambda * t)
    const decayFactor = Math.exp(-DECAY_RATE * Math.max(0, ev.days_ago));
    totalScore += ev.weight * decayFactor;
  });

  const roundedScore = Math.round(totalScore * 10) / 10;

  // Determine status
  let status = 'Active';
  if (roundedScore < 20) {
    status = 'Inactive';
  } else if (roundedScore < 50) {
    status = 'At Risk';
  }

  // Count meets attended
  const meetCount = db.prepare(`
    SELECT COUNT(*) as c FROM meet_attendance a
    JOIN meets m ON a.meet_id = m.id
    WHERE a.user_id = ? AND m.society_id = ?
  `).get(userId, societyId).c;

  // Upsert member_activity
  db.prepare(`
    INSERT INTO member_activity (user_id, society_id, score, status, meets_attended_count, computed_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, society_id) DO UPDATE SET
      score = excluded.score,
      status = excluded.status,
      meets_attended_count = excluded.meets_attended_count,
      computed_at = excluded.computed_at
  `).run(userId, societyId, roundedScore, status, meetCount);

  // Evaluate automatic badge & title rules
  evaluateTitleRules(db, userId, societyId, roundedScore, meetCount);

  return {
    userId,
    societyId,
    score: roundedScore,
    status,
    meetsAttended: meetCount
  };
}

/**
 * Automatic rule-based titles engine
 */
function evaluateTitleRules(db, userId, societyId, score, meetCount) {
  const awardTitle = (title, icon) => {
    try {
      db.prepare(`
        INSERT INTO member_titles (id, user_id, society_id, title, badge_icon, source)
        VALUES (?, ?, ?, ?, ?, 'AUTO')
        ON CONFLICT(user_id, society_id, title) DO NOTHING
      `).run(crypto.randomUUID(), userId, societyId, title, icon);
    } catch (e) {
      // already exists
    }
  };

  // Rule 1: Consistent Meet Attendee (Attended 2+ meets)
  if (meetCount >= 2) {
    awardTitle('Consistent', '🔥');
  }

  // Rule 2: Top Contributor (Score >= 60)
  if (score >= 60) {
    awardTitle('Top Contributor', '⚡');
  }

  // Rule 3: Society Pillar (Score >= 100)
  if (score >= 100) {
    awardTitle('Society Pillar', '🏛️');
  }

  // Rule 4: Dues Supporter (Paid dues)
  const paidDues = db.prepare(`
    SELECT COUNT(*) as c FROM payments WHERE user_id = ? AND society_id = ? AND status = 'SUCCESS'
  `).get(userId, societyId).c;

  if (paidDues > 0) {
    awardTitle('Patron', '💎');
  }
}

/**
 * Recompute activity for all members (e.g. background batch)
 */
function recalculateAllSocieties(db) {
  const memberships = db.prepare('SELECT user_id, society_id FROM memberships').all();
  memberships.forEach(m => {
    recalculateMemberActivity(db, m.user_id, m.society_id);
  });
}

module.exports = {
  EVENT_WEIGHTS,
  recordActivityEvent,
  recalculateMemberActivity,
  recalculateAllSocieties
};
