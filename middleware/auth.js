function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  const isApi =
    (req.originalUrl && req.originalUrl.startsWith('/api/')) ||
    (req.baseUrl && req.baseUrl.startsWith('/api/')) ||
    (req.path && req.path.startsWith('/api/')) ||
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Admin session required.',
    });
  }

  // Redirect unauthenticated browser requests to /admin/login
  return res.redirect('/admin/login');
}

module.exports = {
  requireAdmin,
};
