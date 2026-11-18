const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { waitlistRateLimiter } = require('../middleware/rateLimiter');
const { botProtection, generateBotToken } = require('../middleware/botProtection');

// Public anti-bot token dispenser for legitimate clients
router.get('/token', (req, res) => {
  const ts = Date.now();
  const token = generateBotToken(ts);
  res.json({ ts, token });
});

// Protected public waitlist endpoint
// Pipeline: IP Rate Limiting -> Honeypot/Timing/Payload Bot Defense -> Controller
router.post('/waitlist', waitlistRateLimiter, botProtection, waitlistController.submit);

// Public health check
router.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const ready = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    service: 'ACED Rentals API',
    database: ready === 1 ? 'mongodb' : ready === 2 ? 'connecting' : 'local_json_fallback',
    readyState: ready,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
