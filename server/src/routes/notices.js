const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { recordActivityEvent } = require('../services/activityEngine');

// GET /api/notices - list active notices for a society
router.get('/', (req, res) => {
  const { society_id } = req.query;
  if (!society_id) {
    return res.status(400).json({ error: 'society_id query parameter is required' });
  }

  const notices = db.prepare(`
    SELECT * FROM notices
    WHERE society_id = ? AND deleted = 0
    ORDER BY updated_at DESC
  `).all(society_id);

  res.json({ notices });
});

// GET /api/notices/sync - DELTA SYNC endpoint for offline clients
// Offline devices query this with ?society_id=...&since=ISO_TIMESTAMP
router.get('/sync', (req, res) => {
  const { society_id, since } = req.query;
  if (!society_id) {
    return res.status(400).json({ error: 'society_id is required' });
  }

  let notices;
  if (!since) {
    // Initial full sync
    notices = db.prepare(`
      SELECT * FROM notices
      WHERE society_id = ?
      ORDER BY updated_at ASC
    `).all(society_id);
  } else {
    // Delta sync: records updated or deleted after 'since'
    notices = db.prepare(`
      SELECT * FROM notices
      WHERE society_id = ? AND updated_at > ?
      ORDER BY updated_at ASC
    `).all(society_id, since);
  }

  const serverTime = new Date().toISOString();
  res.json({
    notices,
    serverTime,
    count: notices.length
  });
});

// POST /api/notices - Create or sync notice
// Supports client-generated UUID for offline writes & Last-Write-Wins versioning
router.post('/', authMiddleware, (req, res) => {
  const { id, society_id, title, body, event_at, version } = req.body;

  if (!society_id || !title || !body) {
    return res.status(400).json({ error: 'society_id, title, and body are required' });
  }

  const noticeId = id || crypto.randomUUID();
  const noticeVersion = version || 1;

  // Check if notice already exists (conflict resolution: Last-Write-Wins based on version)
  const existing = db.prepare('SELECT version FROM notices WHERE id = ?').get(noticeId);

  if (existing) {
    if (noticeVersion >= existing.version) {
      db.prepare(`
        UPDATE notices
        SET title = ?, body = ?, event_at = ?, version = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(title, body, event_at || null, noticeVersion + 1, noticeId);
    }
  } else {
    db.prepare(`
      INSERT INTO notices (id, society_id, author_id, author_name, title, body, event_at, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(noticeId, society_id, req.user.id, req.user.fullName, title, body, event_at || null, noticeVersion);

    // Record activity event
    recordActivityEvent(db, req.user.id, society_id, 'NOTICE_POSTED');
  }

  const saved = db.prepare('SELECT * FROM notices WHERE id = ?').get(noticeId);
  res.status(201).json({ message: 'Notice saved successfully', notice: saved });
});

// DELETE /api/notices/:id - Soft delete so offline clients sync the deletion
router.delete('/:id', authMiddleware, (req, res) => {
  const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!notice) {
    return res.status(404).json({ error: 'Notice not found' });
  }

  db.prepare(`
    UPDATE notices
    SET deleted = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ message: 'Notice soft-deleted (offline clients will remove on next sync)' });
});

module.exports = router;
