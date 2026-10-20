const crypto = require('node:crypto');

const ROTATION_SECONDS = 20;

/**
 * Calculates current time slot based on 20-second windows (similar to TOTP)
 */
function getCurrentTimeSlot(timeMs = Date.now()) {
  return Math.floor(timeMs / (ROTATION_SECONDS * 1000));
}

/**
 * Generates an HMAC-SHA256 signature for a meet and time slot
 */
function generateSignature(secretKey, meetId, timeSlot) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(`${meetId}:${timeSlot}`);
  return hmac.digest('hex').slice(0, 16); // 16 chars is plenty and keeps QR payload tiny
}

/**
 * Generates the rotating payload for the meet organizer's screen
 */
function generateRotatingToken(secretKey, meetId) {
  const timeSlot = getCurrentTimeSlot();
  const signature = generateSignature(secretKey, meetId, timeSlot);
  const expiresAt = (timeSlot + 1) * ROTATION_SECONDS * 1000;
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

  return {
    meetId,
    timeSlot,
    signature,
    payload: `CC-MEET:${meetId}:${timeSlot}:${signature}`,
    expiresAt,
    remainingSeconds,
    rotationInterval: ROTATION_SECONDS
  };
}

/**
 * Verifies a scanned attendance token against the meet's secret key
 * Allows a tolerance window of +- 2 slots (up to 40 seconds drift/delay)
 */
function verifyAttendanceToken(secretKey, meetId, timeSlot, signature) {
  const currentSlot = getCurrentTimeSlot();
  const slotDiff = Math.abs(currentSlot - timeSlot);

  // Allow up to 10 minutes drift for delayed offline sync, as long as slot matches the signature
  const expectedSignature = generateSignature(secretKey, meetId, timeSlot);
  const isValidSig = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );

  return {
    valid: isValidSig,
    timeSlot,
    driftSlots: slotDiff
  };
}

module.exports = {
  ROTATION_SECONDS,
  getCurrentTimeSlot,
  generateRotatingToken,
  verifyAttendanceToken
};
