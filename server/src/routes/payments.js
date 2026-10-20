const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const { recordActivityEvent } = require('../services/activityEngine');

// GET /api/payments/:societyId/dues - list dues with user's payment status
router.get('/:societyId/dues', authMiddleware, (req, res) => {
  const { societyId } = req.params;

  const dues = db.prepare(`
    SELECT d.*,
           p.id as payment_id,
           p.status as payment_status,
           p.created_at as paid_at,
           p.transaction_ref
    FROM dues d
    LEFT JOIN payments p ON d.id = p.due_id AND p.user_id = ? AND p.status = 'SUCCESS'
    WHERE d.society_id = ?
    ORDER BY d.due_date ASC
  `).all(req.user.id, societyId);

  res.json({ dues });
});

// POST /api/payments/checkout - Process/Simulate payment (Razorpay test integration + offline fallback)
router.post('/checkout', authMiddleware, (req, res) => {
  const { due_id, society_id, amount_paise, payment_method, offline_intent_id } = req.body;

  if (!society_id || !amount_paise) {
    return res.status(400).json({ error: 'society_id and amount_paise are required' });
  }

  const paymentId = offline_intent_id || crypto.randomUUID();
  const txRef = 'TXN_' + crypto.randomBytes(6).toString('hex').toUpperCase();

  // Deduplicate if offline intent already synced
  const existing = db.prepare('SELECT id FROM payments WHERE id = ?').get(paymentId);
  if (existing) {
    return res.json({ message: 'Payment already recorded', paymentId, status: 'SUCCESS' });
  }

  // Insert payment record
  db.prepare(`
    INSERT INTO payments (id, due_id, society_id, user_id, amount_paise, status, payment_method, transaction_ref, created_at)
    VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, datetime('now'))
  `).run(paymentId, due_id || null, society_id, req.user.id, amount_paise, payment_method || 'RAZORPAY_TEST', txRef);

  // Append to public society ledger (Transparent society fund!)
  const ledgerId = crypto.randomUUID();
  const desc = due_id ? `Membership Dues collected from ${req.user.fullName}` : `Event ticket / contribution by ${req.user.fullName}`;
  db.prepare(`
    INSERT INTO ledger (id, society_id, entry_type, category, amount_paise, description, created_by, created_at)
    VALUES (?, ?, 'CREDIT', 'DUES', ?, ?, ?, datetime('now'))
  `).run(ledgerId, society_id, amount_paise, desc, req.user.fullName);

  // Generate signed QR receipt/ticket
  const ticketData = {
    paymentId,
    txRef,
    userId: req.user.id,
    societyId,
    amountPaise: amount_paise,
    signature: crypto.createHmac('sha256', 'ticket-secret-2026').update(`${paymentId}:${req.user.id}:${amount_paise}`).digest('hex').slice(0, 16)
  };

  // High-impact activity event: +25 points for dues paid!
  recordActivityEvent(db, req.user.id, society_id, 'DUES_PAID');

  res.status(201).json({
    message: 'Payment completed successfully & recorded in society ledger!',
    paymentId,
    transactionRef: txRef,
    ticketQrPayload: `CC-TICKET:${JSON.stringify(ticketData)}`,
    amountFormatted: `₹${(amount_paise / 100).toFixed(2)}`
  });
});

// GET /api/payments/:societyId/ledger - Public transparent ledger
router.get('/:societyId/ledger', (req, res) => {
  const { societyId } = req.params;

  const entries = db.prepare(`
    SELECT * FROM ledger
    WHERE society_id = ?
    ORDER BY created_at DESC
  `).all(societyId);

  // Compute total credits, debits, and balance
  let totalCredits = 0;
  let totalDebits = 0;
  entries.forEach(e => {
    if (e.entry_type === 'CREDIT') totalCredits += e.amount_paise;
    if (e.entry_type === 'DEBIT') totalDebits += e.amount_paise;
  });

  res.json({
    entries,
    summary: {
      totalCreditsPaise: totalCredits,
      totalDebitsPaise: totalDebits,
      balancePaise: totalCredits - totalDebits,
      balanceFormatted: `₹${((totalCredits - totalDebits) / 100).toFixed(2)}`
    }
  });
});

// POST /api/payments/:societyId/ledger/expense - Society President adds an expense
router.post('/:societyId/ledger/expense', authMiddleware, (req, res) => {
  const { societyId } = req.params;
  const { category, amount_paise, description } = req.body;

  if (!amount_paise || !description) {
    return res.status(400).json({ error: 'amount_paise and description are required' });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO ledger (id, society_id, entry_type, category, amount_paise, description, created_by, created_at)
    VALUES (?, ?, 'DEBIT', ?, ?, ?, ?, datetime('now'))
  `).run(id, societyId, category || 'EXPENSE', amount_paise, description, req.user.fullName);

  res.status(201).json({ message: 'Expense recorded in transparent society ledger.' });
});

module.exports = router;
