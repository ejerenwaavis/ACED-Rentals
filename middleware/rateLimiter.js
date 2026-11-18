// Robust in-memory IP rate limiter for waitlist submissions
const submissions = new Map();
const bans = new Map();

const WINDOW_MS = 5 * 60 * 1000; // 5-minute window
const MAX_PER_WINDOW = 5;         // Max 5 attempts per 5 minutes
const BAN_THRESHOLD = 8;          // 8 attempts triggers a 15-minute ban
const BAN_DURATION_MS = 15 * 60 * 1000;

function waitlistRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // 1. Check if IP is currently banned
  const banExpires = bans.get(ip);
  if (banExpires && now < banExpires) {
    const minutesLeft = Math.ceil((banExpires - now) / 60000);
    console.warn(`[RateLimiter] Blocked banned IP: ${ip} (${minutesLeft}m remaining)`);
    return res.status(429).json({
      success: false,
      error: `Too many attempts. Your IP has been temporarily restricted for ${minutesLeft} minute(s).`,
    });
  }

  // 2. Check submissions within window
  const record = submissions.get(ip) || [];
  const recent = record.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= BAN_THRESHOLD) {
    // Ban the abusive IP
    bans.set(ip, now + BAN_DURATION_MS);
    submissions.delete(ip);
    console.warn(`[RateLimiter] Banning abusive IP: ${ip} for 15 minutes.`);
    return res.status(429).json({
      success: false,
      error: 'Excessive requests detected. Please wait 15 minutes before trying again.',
    });
  }

  if (recent.length >= MAX_PER_WINDOW) {
    recent.push(now);
    submissions.set(ip, recent);
    return res.status(429).json({
      success: false,
      error: 'Submission limit reached. Please wait a few minutes before submitting again.',
    });
  }

  recent.push(now);
  submissions.set(ip, recent);

  // Periodic cleanup
  if (submissions.size > 1500) {
    for (const [key, times] of submissions.entries()) {
      if (times.every((t) => now - t > WINDOW_MS)) {
        submissions.delete(key);
      }
    }
  }
  if (bans.size > 500) {
    for (const [key, expires] of bans.entries()) {
      if (now >= expires) {
        bans.delete(key);
      }
    }
  }

  next();
}

module.exports = {
  waitlistRateLimiter,
};
