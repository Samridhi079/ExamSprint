const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { recalculateMemberActivity } = require('../services/activityEngine');

// GET /api/activity/:societyId/me - Student's personal activity score breakdown & status
router.get('/:societyId/me', authMiddleware, (req, res) => {
  const { societyId } = req.params;

  // Make sure activity is up to date
  const activity = recalculateMemberActivity(db, req.user.id, societyId);

  // Get raw events in last 30 days for transparent breakdown
  const events = db.prepare(`
    SELECT type, weight, occurred_at,
           ROUND(julianday('now') - julianday(occurred_at), 1) AS days_ago
    FROM activity_events
    WHERE user_id = ? AND society_id = ? AND julianday('now') - julianday(occurred_at) <= 30
    ORDER BY occurred_at DESC
  `).all(req.user.id, societyId);

  // Get earned titles for this society
  const titles = db.prepare(`
    SELECT title, badge_icon, source, awarded_at
    FROM member_titles
    WHERE user_id = ? AND society_id = ?
    ORDER BY awarded_at ASC
  `).all(req.user.id, societyId);

  // Get member's role
  const membership = db.prepare(`
    SELECT role FROM memberships WHERE user_id = ? AND society_id = ?
  `).get(req.user.id, societyId);

  // Generate gentle nudge advice if At Risk
  let nudge = null;
  if (activity.status === 'At Risk') {
    nudge = {
      severity: 'warning',
      headline: 'Heads up! Your activity in this society is At Risk (Score: ' + activity.score + '/100)',
      suggestion: 'Attend the upcoming weekly meet (+40 pts) or pay pending dues (+25 pts) to restore Active status.'
    };
  } else if (activity.status === 'Inactive') {
    nudge = {
      severity: 'critical',
      headline: 'You are currently marked Inactive in this society',
      suggestion: 'You have not attended recent meets or participated in discussions. Check out upcoming meets to re-engage!'
    };
  }

  res.json({
    score: activity.score,
    status: activity.status,
    role: membership ? membership.role : 'Member',
    meetsAttended: activity.meetsAttended,
    titles,
    nudge,
    eventLog: events,
    scoringFormula: 'Score = Sum of (Base Event Weight × e^(-0.05 × days_ago)) over 30 days'
  });
});

// GET /api/activity/:societyId/roster - Admin activity overview
router.get('/:societyId/roster', authMiddleware, (req, res) => {
  const { societyId } = req.params;

  const summary = db.prepare(`
    SELECT
      COUNT(CASE WHEN ma.status = 'Active' THEN 1 END) as active_count,
      COUNT(CASE WHEN ma.status = 'At Risk' THEN 1 END) as at_risk_count,
      COUNT(CASE WHEN ma.status = 'Inactive' THEN 1 END) as inactive_count,
      COUNT(*) as total_members
    FROM memberships m
    LEFT JOIN member_activity ma ON m.user_id = ma.user_id AND m.society_id = ma.society_id
    WHERE m.society_id = ?
  `).get(societyId);

  res.json({ summary });
});

module.exports = router;
