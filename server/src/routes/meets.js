const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { generateRotatingToken, verifyAttendanceToken } = require('../services/qrService');
const { recordActivityEvent } = require('../services/activityEngine');

// GET /api/meets - list meets for a society
router.get('/', optionalAuth, (req, res) => {
  const { society_id } = req.query;
  if (!society_id) {
    return res.status(400).json({ error: 'society_id query parameter is required' });
  }

  const meets = db.prepare(`
    SELECT m.*,
           COUNT(DISTINCT a.user_id) as attendance_count,
           COUNT(DISTINCT CASE WHEN r.response = 'going' THEN r.user_id END) as going_count,
           COUNT(DISTINCT CASE WHEN r.response = 'maybe' THEN r.user_id END) as maybe_count
    FROM meets m
    LEFT JOIN meet_attendance a ON m.id = a.meet_id
    LEFT JOIN meet_rsvps r ON m.id = r.meet_id
    WHERE m.society_id = ? AND m.deleted = 0
    GROUP BY m.id
    ORDER BY m.starts_at ASC
  `).all(society_id);

  // If user is authenticated, check their RSVP and attendance status
  if (req.user) {
    meets.forEach(m => {
      const myRsvp = db.prepare('SELECT response FROM meet_rsvps WHERE meet_id = ? AND user_id = ?')
        .get(m.id, req.user.id);
      m.user_rsvp = myRsvp ? myRsvp.response : null;

      const myAtt = db.prepare('SELECT scanned_at FROM meet_attendance WHERE meet_id = ? AND user_id = ?')
        .get(m.id, req.user.id);
      m.user_attended = !!myAtt;
      m.user_attended_at = myAtt ? myAtt.scanned_at : null;
    });
  }

  res.json({ meets });
});

// POST /api/meets - Create a meet
router.post('/', authMiddleware, (req, res) => {
  const { id, society_id, title, agenda, venue, starts_at } = req.body;

  if (!society_id || !title || !starts_at) {
    return res.status(400).json({ error: 'society_id, title, and starts_at are required' });
  }

  const meetId = id || crypto.randomUUID();
  const secretKey = crypto.randomBytes(16).toString('hex');

  db.prepare(`
    INSERT INTO meets (id, society_id, title, agenda, venue, starts_at, created_by, secret_key, version, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).run(meetId, society_id, title, agenda || '', venue || 'Campus Main Hall', starts_at, req.user.id, secretKey);

  const created = db.prepare('SELECT id, society_id, title, agenda, venue, starts_at, created_by FROM meets WHERE id = ?').get(meetId);
  res.status(201).json({ message: 'Meet scheduled successfully', meet: created });
});

// POST /api/meets/:id/rsvp - RSVP to a meet
router.post('/:id/rsvp', authMiddleware, (req, res) => {
  const { response } = req.body; // 'going', 'maybe', 'no'
  if (!['going', 'maybe', 'no'].includes(response)) {
    return res.status(400).json({ error: 'Response must be going, maybe, or no' });
  }

  const meet = db.prepare('SELECT id, society_id FROM meets WHERE id = ?').get(req.params.id);
  if (!meet) {
    return res.status(404).json({ error: 'Meet not found' });
  }

  db.prepare(`
    INSERT INTO meet_rsvps (meet_id, user_id, response, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(meet_id, user_id) DO UPDATE SET
      response = excluded.response,
      updated_at = excluded.updated_at
  `).run(meet.id, req.user.id, response);

  if (response === 'going') {
    recordActivityEvent(db, req.user.id, meet.society_id, 'MEET_RSVP');
  }

  res.json({ message: `RSVP updated to ${response}`, meetId: meet.id, response });
});

// GET /api/meets/:id/rotating-token - Organizer Screen
// Generates the cryptographic rotating token that changes every 20 seconds
router.get('/:id/rotating-token', authMiddleware, (req, res) => {
  const meet = db.prepare('SELECT id, society_id, title, secret_key, created_by FROM meets WHERE id = ?').get(req.params.id);
  if (!meet) {
    return res.status(404).json({ error: 'Meet not found' });
  }

  const tokenData = generateRotatingToken(meet.secret_key, meet.id);
  res.json({
    ...tokenData,
    meetTitle: meet.title
  });
});

// POST /api/meets/:id/attendance - Student Scans & Submits (Direct or Sync from Outbox)
router.post('/:id/attendance', authMiddleware, (req, res) => {
  const { rawPayload, timeSlot, signature, offlineScannedAt } = req.body;
  const meet = db.prepare('SELECT id, society_id, secret_key FROM meets WHERE id = ?').get(req.params.id);

  if (!meet) {
    return res.status(404).json({ error: 'Meet not found' });
  }

  let slot = timeSlot;
  let sig = signature;

  // If rawPayload was scanned from QR: "CC-MEET:meetId:timeSlot:signature"
  if (rawPayload && rawPayload.startsWith('CC-MEET:')) {
    const parts = rawPayload.split(':');
    if (parts.length >= 4) {
      slot = parseInt(parts[2], 10);
      sig = parts[3];
    }
  }

  if (slot === undefined || !sig) {
    return res.status(400).json({ error: 'Missing timeSlot or signature in attendance token payload' });
  }

  // Cryptographic signature verification
  const verification = verifyAttendanceToken(meet.secret_key, meet.id, slot, sig);
  if (!verification.valid) {
    return res.status(400).json({
      error: 'Invalid or forged QR token signature. Attendance rejected.',
      code: 'INVALID_SIGNATURE'
    });
  }

  // Check if user already marked attendance
  const alreadyAttended = db.prepare('SELECT id, scanned_at FROM meet_attendance WHERE meet_id = ? AND user_id = ?')
    .get(meet.id, req.user.id);

  if (alreadyAttended) {
    return res.json({
      message: 'Attendance already recorded previously for this meet.',
      alreadyRecorded: true,
      scannedAt: alreadyAttended.scanned_at
    });
  }

  const attId = crypto.randomUUID();
  const scanTime = offlineScannedAt || new Date().toISOString();
  const verifiedOffline = offlineScannedAt ? 1 : 0;

  db.prepare(`
    INSERT INTO meet_attendance (id, meet_id, user_id, scanned_at, time_slot, verified_offline)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(attId, meet.id, req.user.id, scanTime, slot, verifiedOffline);

  // High-value activity event: +40 points for meet attendance!
  recordActivityEvent(db, req.user.id, meet.society_id, 'MEET_ATTENDED');

  res.status(201).json({
    message: 'Attendance verified & marked successfully! (+40 Activity Points)',
    attendance: {
      id: attId,
      meetId: meet.id,
      userId: req.user.id,
      scannedAt: scanTime,
      verifiedOffline: !!verifiedOffline
    }
  });
});

// GET /api/meets/:id/attendees - List who attended
router.get('/:id/attendees', (req, res) => {
  const attendees = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.branch, a.scanned_at, a.verified_offline
    FROM meet_attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.meet_id = ?
    ORDER BY a.scanned_at DESC
  `).all(req.params.id);

  res.json({ attendees, count: attendees.length });
});

module.exports = router;
