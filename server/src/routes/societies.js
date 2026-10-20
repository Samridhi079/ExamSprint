const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { recordActivityEvent } = require('../services/activityEngine');

// GET /api/societies - list all societies with member count
router.get('/', optionalAuth, (req, res) => {
  const societies = db.prepare(`
    SELECT s.*,
           COUNT(DISTINCT m.user_id) as member_count,
           COUNT(DISTINCT n.id) as notice_count,
           COUNT(DISTINCT mt.id) as meet_count
    FROM societies s
    LEFT JOIN memberships m ON s.id = m.society_id
    LEFT JOIN notices n ON s.id = n.society_id AND n.deleted = 0
    LEFT JOIN meets mt ON s.id = mt.society_id AND mt.deleted = 0
    GROUP BY s.id
  `).all();

  // If user is authenticated, check which societies they belong to
  if (req.user) {
    const userSocieties = new Set(
      db.prepare('SELECT society_id FROM memberships WHERE user_id = ?').all(req.user.id).map(r => r.society_id)
    );
    societies.forEach(s => {
      s.is_member = userSocieties.has(s.id);
    });
  }

  res.json({ societies });
});

// GET /api/societies/:id - get society details
router.get('/:id', optionalAuth, (req, res) => {
  const society = db.prepare('SELECT * FROM societies WHERE id = ?').get(req.params.id);
  if (!society) {
    return res.status(404).json({ error: 'Society not found' });
  }

  let membership = null;
  if (req.user) {
    membership = db.prepare('SELECT role, status, joined_at FROM memberships WHERE user_id = ? AND society_id = ?')
      .get(req.user.id, society.id);
  }

  res.json({ society, membership });
});

// POST /api/societies/:id/join - join society
router.post('/:id/join', authMiddleware, (req, res) => {
  const society = db.prepare('SELECT id, name FROM societies WHERE id = ?').get(req.params.id);
  if (!society) {
    return res.status(404).json({ error: 'Society not found' });
  }

  const existing = db.prepare('SELECT * FROM memberships WHERE user_id = ? AND society_id = ?')
    .get(req.user.id, society.id);

  if (existing) {
    return res.status(400).json({ error: 'You are already a member of this society.' });
  }

  db.prepare(`
    INSERT INTO memberships (user_id, society_id, role, status)
    VALUES (?, ?, 'Member', 'Active')
  `).run(req.user.id, society.id);

  // Award Founding Member title if society is recent
  try {
    db.prepare(`
      INSERT INTO member_titles (id, user_id, society_id, title, badge_icon, source)
      VALUES (?, ?, ?, 'Founding Member', '👑', 'AUTO')
      ON CONFLICT DO NOTHING
    `).run(crypto.randomUUID(), req.user.id, society.id);
  } catch (e) {}

  res.status(201).json({ message: `Successfully joined ${society.name}!`, role: 'Member' });
});

// GET /api/societies/:id/members - get members roster with activity score, status, titles
router.get('/:id/members', (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.branch, m.role, m.joined_at,
           COALESCE(ma.score, 0) as activity_score,
           COALESCE(ma.status, 'Active') as activity_status,
           COALESCE(ma.meets_attended_count, 0) as meets_attended
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN member_activity ma ON m.user_id = ma.user_id AND m.society_id = ma.society_id
    WHERE m.society_id = ?
    ORDER BY
      CASE m.role
        WHEN 'President' THEN 1
        WHEN 'Core Member' THEN 2
        WHEN 'Treasurer' THEN 3
        ELSE 4
      END,
      activity_score DESC
  `).all(req.params.id);

  // Attach badges / titles for each member
  const titles = db.prepare(`
    SELECT user_id, title, badge_icon, source
    FROM member_titles
    WHERE society_id = ?
  `).all(req.params.id);

  const titleMap = {};
  titles.forEach(t => {
    if (!titleMap[t.user_id]) titleMap[t.user_id] = [];
    titleMap[t.user_id].push({ title: t.title, icon: t.badge_icon, source: t.source });
  });

  members.forEach(m => {
    m.titles = titleMap[m.id] || [];
  });

  res.json({ members });
});

module.exports = router;
