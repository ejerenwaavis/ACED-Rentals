const { WaitlistStore } = require('../models/Waitlist');

// Helper to determine contact type and clean it
function parseContact(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const cleaned = rawInput.trim();

  // Email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(cleaned)) {
    return { contact: cleaned.toLowerCase(), type: 'email' };
  }

  // Phone check (US or international digits)
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { contact: cleaned, type: 'phone' };
  }

  return null;
}

const waitlistController = {
  async submit(req, res) {
    try {
      const { contact, source } = req.body;
      const parsed = parseContact(contact);

      if (!parsed) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address or 10-digit phone number.',
        });
      }

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const { lead, isDuplicate } = await WaitlistStore.addLead({
        contact: parsed.contact,
        type: parsed.type,
        source: source || 'early_access_page',
        status: 'new',
        ip,
        userAgent,
      });

      const metrics = await WaitlistStore.getMetrics();

      if (isDuplicate) {
        return res.json({
          success: true,
          isDuplicate: true,
          message: 'You are already on the early access list! We will reach out as soon as vans are ready.',
          totalWaitlist: metrics.total,
        });
      }

      return res.status(201).json({
        success: true,
        isDuplicate: false,
        message: '40% launch discount locked! You are on the early access priority list.',
        spotNumber: metrics.total,
        totalWaitlist: metrics.total,
      });
    } catch (err) {
      console.error('[Waitlist] Error saving lead:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to join waitlist. Please try again shortly.',
      });
    }
  },

  async list(req, res) {
    try {
      const { status, search } = req.query;
      const leads = await WaitlistStore.getAllLeads({ status, search });
      const metrics = await WaitlistStore.getMetrics();

      return res.json({
        success: true,
        count: leads.length,
        metrics,
        leads,
      });
    } catch (err) {
      console.error('[Waitlist] Error listing leads:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve waitlist.' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status && notes === undefined) {
        return res.status(400).json({ success: false, error: 'Nothing to update.' });
      }

      const updated = await WaitlistStore.updateLeadStatus(id, status, notes);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Lead not found.' });
      }

      return res.json({ success: true, lead: updated });
    } catch (err) {
      console.error('[Waitlist] Error updating lead:', err);
      return res.status(500).json({ success: false, error: 'Failed to update lead.' });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;
      await WaitlistStore.deleteLead(id);
      return res.json({ success: true, message: 'Lead removed successfully.' });
    } catch (err) {
      console.error('[Waitlist] Error deleting lead:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete lead.' });
    }
  },

  async exportCSV(req, res) {
    try {
      const leads = await WaitlistStore.getAllLeads();

      const headers = ['ID', 'Contact', 'Type', 'Status', 'Date Joined', 'Notes'];
      const rows = leads.map((l) => [
        `"${l._id || ''}"`,
        `"${(l.contact || '').replace(/"/g, '""')}"`,
        `"${l.type || ''}"`,
        `"${l.status || 'new'}"`,
        `"${l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      const filename = `aced-rentals-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    } catch (err) {
      console.error('[Waitlist] Error exporting CSV:', err);
      return res.status(500).json({ success: false, error: 'Failed to export CSV.' });
    }
  },
};

module.exports = waitlistController;
