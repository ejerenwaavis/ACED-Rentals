const { WaitlistStore } = require('../models/Waitlist');

const adminController = {
  async getDashboardStats(req, res) {
    try {
      const metrics = await WaitlistStore.getMetrics();
      const recent = await WaitlistStore.getAllLeads();
      return res.json({
        success: true,
        metrics,
        recentSignups: recent.slice(0, 10),
      });
    } catch (err) {
      console.error('[Admin] Error fetching dashboard stats:', err);
      return res.status(500).json({ success: false, error: 'Failed to load dashboard metrics.' });
    }
  },
};

module.exports = adminController;
