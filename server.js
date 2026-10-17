/**
 * Foodie App — Express Server
 * - User auth (signup / login) with hashed passwords
 * - Session-based login + admin login
 * - Serves static frontend from /public
 * - Environment-driven configuration (see .env.example)
 */

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');

const app = express();

// ---------------------------------------------------------------------------
// Configuration (from environment with safe fallbacks for development)
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT, 10) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodieDB';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// No well-known default password is shipped with the repository.
// In development a temporary password is generated for the current run and
// printed once at startup; in production the app refuses to start unless
// ADMIN_PASSWORD is provided (see the required-variable check below).
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || (isProduction ? '' : crypto.randomBytes(9).toString('hex'));

if (!process.env.ADMIN_PASSWORD && !isProduction) {
  console.warn(`[config] ADMIN_PASSWORD not set — temporary dev password for this run: ${ADMIN_PASSWORD}`);
}

// In production the app refuses to start with missing configuration instead of
// silently falling back to development defaults.
if (isProduction) {
  const required = ['MONGODB_URI', 'SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[config] Missing required environment variables: ${missing.join(', ')}`);
    console.error('         Copy .env.example to .env (or set them in your host dashboard).');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // keep permissive for inline styles/scripts used by current frontend
    crossOriginEmbedderPolicy: false,
  })
);

// Parse bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // true only over HTTPS in production
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24h
    },
  })
);

// Admin-only pages must not be reachable through the static file server.
// This guard runs *before* express.static so a direct GET cannot bypass it.
const ADMIN_ONLY_PAGES = new Set([
  'adminpage.html',
  'add_product.html',
  'delete_product.html',
  'view_orders.html',
  'view_customers.html',
]);

app.use((req, res, next) => {
  if (req.method === 'GET' && ADMIN_ONLY_PAGES.has(path.basename(req.path))) {
    return isAdminAuthenticated(req, res, next);
  }
  return next();
});

// Static assets — served from /public
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
function connectDatabase() {
  return mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('[db] Connected to MongoDB'))
    .catch((error) => {
      console.error('[db] Could not connect to MongoDB:', error.message);
      console.error('      Check MONGODB_URI in your .env file and ensure MongoDB is running.');
    });
}

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isAuthenticated(req, res, next) {
  if (req.session && req.session.isLoggedIn) return next();
  return res.redirect('/?message=Please log in to continue.');
}

function isAdminAuthenticated(req, res, next) {
  if (req.session && req.session.isAdminLoggedIn) return next();
  return res.redirect('/adminlogin.html?message=You must be logged in as an admin to access this page');
}

// ---------------------------------------------------------------------------
// Page routes
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/indiandish', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'indiandish.html'));
});

// Admin pages (/adminpage.html and friends) are protected by the guard above
// and then served by express.static from /public.

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

// Sign up
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.redirect('/signup?message=All fields are required');
    }
    if (password.length < 6) {
      return res.redirect('/signup?message=Password must be at least 6 characters');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.redirect('/login?message=An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });
    await newUser.save();

    req.session.isLoggedIn = true;
    req.session.username = newUser.username;
    return res.redirect('/?message=Account created successfully');
  } catch (error) {
    console.error('[auth] Error creating account:', error.message);
    return res.status(400).redirect('/signup?message=Error creating account');
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      req.session.isLoggedIn = true;
      req.session.username = user.username;
      return res.redirect('/?message=Logged in successfully');
    }
    return res.redirect('/login?message=Invalid email or password');
  } catch (error) {
    console.error('[auth] Error during login:', error.message);
    return res.status(500).send('Server error — please try again later.');
  }
});

// Logout (user)
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Could not log out. Please try again.');
    res.clearCookie('connect.sid');
    return res.redirect('/?message=You have been logged out');
  });
});

// Admin login
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdminLoggedIn = true;
    return res.redirect('/adminpage.html?message=Admin logged in successfully');
  }
  return res.redirect('/adminlogin.html?message=Invalid admin credentials');
});

// Admin logout
app.post('/admin-logout', (req, res) => {
  req.session.isAdminLoggedIn = false;
  return res.redirect('/?message=Admin logged out successfully');
});

// ---------------------------------------------------------------------------
// JSON API (for frontend fetch)
// ---------------------------------------------------------------------------
app.get('/check-auth', (req, res) => {
  if (req.session && req.session.isLoggedIn) {
    return res.json({ loggedIn: true });
  }
  return res.json({ loggedIn: false });
});

app.get('/api/check-login-status', (req, res) => {
  if (req.session && req.session.isLoggedIn) {
    return res.json({ isLoggedIn: true, username: req.session.username });
  }
  return res.json({ isLoggedIn: false });
});

/**
 * GET /api/customers
 * Returns non-sensitive customer info (username + email only).
 * Previously /api/items leaked password hashes — now restricted.
 */
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await User.find({}, { username: 1, email: 1, _id: 0 }).lean();
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Deprecated alias — kept for backwards compatibility with frontend that calls /api/items
app.get('/api/items', async (req, res) => {
  try {
    const customers = await User.find({}, { username: 1, email: 1, _id: 0 }).lean();
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: dbStatus, uptime: process.uptime() });
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
function startServer() {
  connectDatabase();
  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Foodie is running on http://localhost:${PORT}`);
    console.log(
      `[server] Environment: ${NODE_ENV} | DB: ${MONGODB_URI.replace(/:\/\/.*@/, '://***:***@')}`
    );
  });
}

// Only boot when run directly (`node server.js` / `npm start`).
// Importing this module (e.g. from tests) does not open a port or a DB connection.
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, connectDatabase };
