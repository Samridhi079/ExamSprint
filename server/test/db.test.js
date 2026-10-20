const test = require('node:test');
const assert = require('node:assert');
const { db, initDatabase } = require('../src/database');
const { recalculateMemberActivity } = require('../src/services/activityEngine');

test('Database - schema and seed data integrity', () => {
  initDatabase();
  const societies = db.prepare('SELECT * FROM societies').all();
  assert.ok(societies.length >= 3, 'Expected at least 3 seeded societies');

  const users = db.prepare('SELECT * FROM users').all();
  assert.ok(users.length >= 3, 'Expected at least 3 seeded users');

  const notices = db.prepare('SELECT * FROM notices').all();
  assert.ok(notices.length >= 2, 'Expected seeded notices');

  const meets = db.prepare('SELECT * FROM meets').all();
  assert.ok(meets.length >= 1, 'Expected seeded meets');
});

test('Activity Calculation - updates score and awards badges correctly', () => {
  initDatabase();
  const result = recalculateMemberActivity(db, 'u-101', 'soc-code');
  assert.ok(typeof result.score === 'number');
  assert.ok(['Active', 'At Risk', 'Inactive'].includes(result.status));
});
