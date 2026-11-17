function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  // If request is an API call, return 401 JSON
  if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Admin session required.' });
  }

  // Otherwise redirect to admin login page
  return res.redirect('/admin/login.html');
}

module.exports = {
  requireAdmin,
};
