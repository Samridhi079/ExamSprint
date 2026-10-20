const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { recordActivityEvent } = require('../services/activityEngine');

module.exports = function (io) {
  // GET /api/chat/:societyId/messages - Get chat messages (with optional sequence filter)
  router.get('/:societyId/messages', authMiddleware, (req, res) => {
    const { societyId } = req.params;
    const { afterSequence } = req.query;

    let messages;
    if (afterSequence) {
      messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE society_id = ? AND sequence_num > ?
        ORDER BY sequence_num ASC
        LIMIT 100
      `).all(societyId, parseInt(afterSequence, 10));
    } else {
      messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE society_id = ?
        ORDER BY sequence_num DESC
        LIMIT 50
      `).all(societyId);
      messages.reverse(); // chronological order
    }

    res.json({ messages });
  });

  // POST /api/chat/:societyId/messages - Send or sync message from offline outbox
  router.post('/:societyId/messages', authMiddleware, (req, res) => {
    const { societyId } = req.params;
    const { id, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const messageId = id || crypto.randomUUID();

    // Check if message already exists (idempotent offline deduplication)
    const existing = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);
    if (existing) {
      return res.json({ message: existing, alreadySynced: true });
    }

    // Allocate next sequence number for this society
    const lastSeq = db.prepare('SELECT MAX(sequence_num) as maxSeq FROM chat_messages WHERE society_id = ?').get(societyId);
    const nextSeq = (lastSeq && lastSeq.maxSeq ? lastSeq.maxSeq : 0) + 1;

    db.prepare(`
      INSERT INTO chat_messages (id, society_id, sender_id, sender_name, content, sequence_num, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(messageId, societyId, req.user.id, req.user.fullName, content.trim(), nextSeq);

    const saved = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);

    // Broadcast over WebSocket to all active room members
    if (io) {
      io.to(`society_${societyId}`).emit('new_message', saved);
    }

    // Record activity event
    recordActivityEvent(db, req.user.id, societyId, 'CHAT_MESSAGE');

    res.status(201).json({ message: saved });
  });

  return router;
};
