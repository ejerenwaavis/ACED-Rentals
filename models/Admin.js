const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'acedrentals2026';

const AdminModel = {
  verifyCredentials(username, password) {
    if (!username || !password) return false;
    const envUser = process.env.ADMIN_USER || DEFAULT_ADMIN_USERNAME;
    const envPass = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

    // Check username (case-insensitive)
    if (username.trim().toLowerCase() !== envUser.trim().toLowerCase()) {
      return false;
    }

    // Direct match against configured password
    return password === envPass;
  },

  getUsername() {
    return process.env.ADMIN_USER || DEFAULT_ADMIN_USERNAME;
  },
};

module.exports = AdminModel;
