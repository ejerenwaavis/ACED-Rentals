const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'waitlist.json');

// Ensure local fallback directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
}

let isMongoConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('<password>') || uri.includes('YOUR_MONGODB_URI')) {
    console.log('[DB] No valid MONGODB_URI found in environment.');
    console.log('[DB] -> Running in resilient local storage mode: data/waitlist.json');
    isMongoConnected = false;
    return false;
  }

  try {
    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log('[DB] ✓ Connected to MongoDB successfully.');

    // Auto-migrate any local JSON fallback data to MongoDB if present
    await migrateLocalDataIfAny();
    return true;
  } catch (err) {
    console.error('[DB] ⚠ MongoDB connection error:', err.message);
    console.log('[DB] -> Falling back to local file storage (data/waitlist.json).');
    isMongoConnected = false;
    return false;
  }
}

// Local File Store Helpers
function readLocalWaitlist() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeLocalWaitlist(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function migrateLocalDataIfAny() {
  try {
    const local = readLocalWaitlist();
    if (local && local.length > 0) {
      const Waitlist = mongoose.model('Waitlist');
      for (const item of local) {
        const exists = await Waitlist.findOne({ contact: item.contact });
        if (!exists) {
          await Waitlist.create({
            contact: item.contact,
            type: item.type || 'email',
            source: item.source || 'early_access',
            status: item.status || 'new',
            ip: item.ip || '',
            userAgent: item.userAgent || '',
            notes: item.notes || '',
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          });
        }
      }
      console.log(`[DB] ✓ Synced ${local.length} local leads to MongoDB.`);
    }
  } catch (e) {
    console.log('[DB] Migration note:', e.message);
  }
}

module.exports = {
  connectDB,
  isMongoConnected: () => mongoose.connection.readyState === 1,
  readLocalWaitlist,
  writeLocalWaitlist,
};
