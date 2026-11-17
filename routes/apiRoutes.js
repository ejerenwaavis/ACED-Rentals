const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { waitlistRateLimiter } = require('../middleware/rateLimiter');
const { isMongoConnected } = require('../config/db');

// Public endpoints
router.post('/waitlist', waitlistRateLimiter, waitlistController.submit);

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
