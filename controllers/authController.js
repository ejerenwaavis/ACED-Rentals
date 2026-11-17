const AdminModel = require('../models/Admin');

const authController = {
  login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required.' });
    }

    const isValid = AdminModel.verifyCredentials(username, password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid admin username or password.' });
    }

    req.session.isAdmin = true;
    req.session.adminUser = username;

    return res.json({
      success: true,
      message: 'Authenticated successfully.',
      user: { username },
    });
  },

  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Could not log out.' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully.' });
    });
  },

  me(req, res) {
    if (req.session && req.session.isAdmin) {
      return res.json({
        success: true,
        authenticated: true,
        user: { username: req.session.adminUser || AdminModel.getUsername() },
      });
    }
    return res.json({ success: false, authenticated: false });
  },
};

module.exports = authController;
