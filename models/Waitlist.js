const mongoose = require('mongoose');
const { isMongoConnected, readLocalWaitlist, writeLocalWaitlist } = require('../config/db');

const waitlistSchema = new mongoose.Schema(
  {
    contact: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email',
    },
    source: {
      type: String,
      default: 'early_access',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'reserved', 'unsubscribed'],
      default: 'new',
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation in development / hot reload
const MongoWaitlist = mongoose.models.Waitlist || mongoose.model('Waitlist', waitlistSchema);

// Hybrid Data Access Layer (MongoDB <-> JSON Fallback)
const WaitlistStore = {
  async addLead(leadData) {
    if (isMongoConnected()) {
      const existing = await MongoWaitlist.findOne({ contact: leadData.contact });
      if (existing) {
        return { lead: existing, isDuplicate: true };
      }
      const lead = await MongoWaitlist.create(leadData);
      return { lead, isDuplicate: false };
    } else {
      const leads = readLocalWaitlist();
      const existing = leads.find((l) => l.contact.toLowerCase() === leadData.contact.toLowerCase());
      if (existing) {
        return { lead: existing, isDuplicate: true };
      }
      const newLead = {
        _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...leadData,
        status: leadData.status || 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      leads.unshift(newLead);
      writeLocalWaitlist(leads);
      return { lead: newLead, isDuplicate: false };
    }
  },

  async getAllLeads(filter = {}) {
    if (isMongoConnected()) {
      const query = {};
      if (filter.status && filter.status !== 'all') {
        query.status = filter.status;
      }
      if (filter.search) {
        query.contact = { $regex: filter.search, $options: 'i' };
      }
      return await MongoWaitlist.find(query).sort({ createdAt: -1 }).lean();
    } else {
      let leads = readLocalWaitlist();
      if (filter.status && filter.status !== 'all') {
        leads = leads.filter((l) => l.status === filter.status);
      }
      if (filter.search) {
        const s = filter.search.toLowerCase();
        leads = leads.filter((l) => l.contact.toLowerCase().includes(s));
      }
      return leads;
    }
  },

  async updateLeadStatus(id, status, notes = null) {
    if (isMongoConnected()) {
      const update = { status };
      if (notes !== null) update.notes = notes;
      return await MongoWaitlist.findByIdAndUpdate(id, update, { new: true });
    } else {
      const leads = readLocalWaitlist();
      const index = leads.findIndex((l) => l._id.toString() === id.toString());
      if (index === -1) return null;
      leads[index].status = status;
      if (notes !== null) leads[index].notes = notes;
      leads[index].updatedAt = new Date().toISOString();
      writeLocalWaitlist(leads);
      return leads[index];
    }
  },

  async deleteLead(id) {
    if (isMongoConnected()) {
      return await MongoWaitlist.findByIdAndDelete(id);
    } else {
      const leads = readLocalWaitlist();
      const filtered = leads.filter((l) => l._id.toString() !== id.toString());
      writeLocalWaitlist(filtered);
      return true;
    }
  },

  async getMetrics() {
    const all = await this.getAllLeads();
    const today = new Date().toISOString().slice(0, 10);

    const total = all.length;
    const todayCount = all.filter((l) => {
      const d = l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : '';
      return d === today;
    }).length;

    const emailCount = all.filter((l) => l.type === 'email').length;
    const phoneCount = all.filter((l) => l.type === 'phone').length;
    const contactedCount = all.filter((l) => l.status === 'contacted').length;

    return {
      total,
      today: todayCount,
      emails: emailCount,
      phones: phoneCount,
      contacted: contactedCount,
      isMongo: isMongoConnected(),
    };
  },
};

module.exports = {
  MongoWaitlist,
  WaitlistStore,
};
