const test = require('node:test');
const assert = require('node:assert');
const { generateRotatingToken, verifyAttendanceToken } = require('../src/services/qrService');
const { EVENT_WEIGHTS } = require('../src/services/activityEngine');

test('QR Service - generates and verifies rotating attendance tokens with HMAC', () => {
  const secretKey = 'test-secret-key-12345';
  const meetId = 'meet-test-1';

  const tokenData = generateRotatingToken(secretKey, meetId);
  assert.ok(tokenData.payload.startsWith('CC-MEET:'));
  assert.strictEqual(tokenData.meetId, meetId);
  assert.ok(tokenData.signature.length === 16);

  // Verification succeeds with matching signature
  const verification = verifyAttendanceToken(secretKey, meetId, tokenData.timeSlot, tokenData.signature);
  assert.strictEqual(verification.valid, true);

  // Verification fails with tampered signature
  const tampered = verifyAttendanceToken(secretKey, meetId, tokenData.timeSlot, 'badsignature1234');
  assert.strictEqual(tampered.valid, false);
});

test('Activity Engine - verify weight constants', () => {
  assert.strictEqual(EVENT_WEIGHTS.MEET_ATTENDED, 40);
  assert.strictEqual(EVENT_WEIGHTS.DUES_PAID, 25);
  assert.strictEqual(EVENT_WEIGHTS.NOTICE_POSTED, 20);
});
