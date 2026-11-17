// Simple in-memory IP rate limiter for waitlist submissions
const submissions = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_PER_WINDOW = 5;

function waitlistRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = submissions.get(ip) || [];
  const recent = record.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'Too many submissions. Please wait a minute and try again.',
    });
  }

  recent.push(now);
  submissions.set(ip, recent);

  // Periodic cleanup
  if (submissions.size > 2000) {
    for (const [key, times] of submissions.entries()) {
      if (times.every((t) => now - t > WINDOW_MS)) {
        submissions.delete(key);
      }
    }
  }

  next();
}

module.exports = {
  waitlistRateLimiter,
};
