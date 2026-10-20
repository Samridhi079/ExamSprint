const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { db } = require('../database');
const { generateToken, authMiddleware } = require('../middleware/authMiddleware');

// College email validation helper
function isCollegeEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  // Accepts .edu, .ac.in, or any academic/college domain
  return domain.endsWith('.edu') || domain.endsWith('.ac.in') || domain.includes('college') || domain.includes('campus');
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, full_name, branch, graduation_year, role } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  if (!isCollegeEmail(email)) {
    return res.status(400).json({
      error: 'Registration restricted to campus emails (must end with .edu, .ac.in, or include college/campus domain).'
    });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'A student with this college email is already registered.' });
  }

  const id = crypto.randomUUID();
  const password_hash = bcrypt.hashSync(password, 10);
  const userRole = role || 'STUDENT';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, branch, graduation_year, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, email, password_hash, full_name, branch || 'Computer Science', graduation_year || 2026, userRole);

  const newUser = { id, email, full_name, branch, graduation_year, role: userRole };
  const token = generateToken(newUser);

  res.status(201).json({
    message: 'Registered successfully',
    token,
    user: newUser
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      branch: user.branch,
      graduationYear: user.graduation_year,
      role: user.role
    }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, branch, graduation_year, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get user's societies, roles, and titles
  const memberships = db.prepare(`
    SELECT m.society_id, m.role, m.status, s.name as society_name, s.category
    FROM memberships m
    JOIN societies s ON m.society_id = s.id
    WHERE m.user_id = ?
  `).all(req.user.id);

  const titles = db.prepare(`
    SELECT society_id, title, badge_icon, source
    FROM member_titles
    WHERE user_id = ?
  `).all(req.user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      branch: user.branch,
      graduationYear: user.graduation_year,
      role: user.role
    },
    memberships,
    titles
  });
});

// GET /api/auth/demo-users (Convenient for quick testing/switching accounts in paired presentations!)
router.get('/demo-users', (req, res) => {
  const users = db.prepare('SELECT id, email, full_name, branch, graduation_year, role FROM users').all();
  res.json({ users });
});

module.exports = router;
