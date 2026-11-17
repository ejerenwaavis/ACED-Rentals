const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { waitlistRateLimiter } = require('../middleware/rateLimiter');
const { isMongoConnected } = require('../config/db');

// Public endpoints
router.post('/waitlist', waitlistRateLimiter, waitlistController.submit);

// Public health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ACED Rentals API',
    database: isMongoConnected() ? 'mongodb' : 'local_json_fallback',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
