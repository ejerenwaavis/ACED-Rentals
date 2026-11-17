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

// Security Headers (Configured for Tailwind CDN & Google Fonts)
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline SVG & Tailwind CDN without friction
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

// Serve static frontend files from public_html
// IMPORTANT: dotfiles: 'allow' ensures Let's Encrypt / acme-challenge files are served!
const staticDir = path.join(__dirname, 'public_html');
app.use(express.static(staticDir, { dotfiles: 'allow' }));

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Admin portal route guards
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(staticDir, 'admin', 'index.html'));
});
app.get('/admin/index.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(staticDir, 'admin', 'index.html'));
});

// Top-level health check endpoint for monitoring & deployment
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// SPA / 404 Fallback: serve Coming Soon page
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
  console.log(`[ACED Rentals] Coming Soon: http://localhost:${PORT}`);
  console.log(`[ACED Rentals] Admin Panel: http://localhost:${PORT}/admin`);
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
