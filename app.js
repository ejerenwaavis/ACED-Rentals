const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Namecheap Passenger / Reverse Proxy
app.set('trust proxy', 1);

// Session setup
app.use(
  session({
    name: 'aced_rentals_sid',
    secret: process.env.SESSION_SECRET || 'aced-rentals-super-secure-session-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Admin view paths (strictly separated outside public_html)
const adminViewsDir = path.join(__dirname, 'views', 'admin');

// Admin Login Route (Public, but redirects to /admin if already authenticated)
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(adminViewsDir, 'login.html'));
});

// Admin Dashboard Route (Strictly guarded by requireAdmin middleware)
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(adminViewsDir, 'index.html'));
});

// Route redirects for legacy URLs
app.get('/admin/index.html', (req, res) => res.redirect('/admin'));
app.get('/admin/login.html', (req, res) => res.redirect('/admin/login'));

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend files from public_html (index.html, robots.txt, etc.)
// dotfiles: 'allow' ensures Let's Encrypt / acme-challenge files are served
const staticDir = path.join(__dirname, 'public_html');
app.use(express.static(staticDir, { dotfiles: 'allow' }));

// Top-level health check endpoint for monitoring & deployment
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Fallback: unhandled GET routes serve public Landing Page
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Connect to Database asynchronously in background
connectDB().catch((err) => {
  console.error('[DB] Background connection error:', err.message);
});

// Start listening immediately (Passenger requirement)
const server = app.listen(PORT, () => {
  console.log(`[ACED Rentals] Server listening on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', err);
  }
});

// Passenger export
module.exports = app;
