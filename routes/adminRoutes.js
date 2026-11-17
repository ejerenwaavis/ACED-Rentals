const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// All routes here require admin session
router.use(requireAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/leads', waitlistController.list);
router.patch('/leads/:id', waitlistController.update);
router.delete('/leads/:id', waitlistController.remove);
router.get('/export', waitlistController.exportCSV);

module.exports = router;
