
const express = require('express');
// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./userModel');
const router = express.Router();

const JWT_SECRET = 'your_jwt_secret'; // Change to env var in production

// Endpoint for user to get their assigned forms
router.get('/user/forms', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const result = await pool.query('SELECT form_access FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user || !user.form_access) return res.json([]);
    const forms = user.form_access.split(',').map(f => f.trim()).filter(f => f);
    res.json(forms);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Register route

// Admin-only endpoint to create users
function requireRole(role) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      if (decoded.role !== role) return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

router.post('/admin/create-user', requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  // Store plain password directly
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, password, role || 'user']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'User exists or DB error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    // Compare plain text passwords
    const match = password === user.password;
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role });
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Middleware for role check
function requireRole(role) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      if (decoded.role !== role) return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Admin route to assign form access
router.post('/assign-access', requireRole('admin'), async (req, res) => {
  const { userId, forms } = req.body;
  try {
    await pool.query('UPDATE users SET form_access = $1 WHERE id = $2', [forms.join(','), userId]);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

// Middleware to check form access
function requireFormAccess(formName) {
  return async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      const result = await pool.query('SELECT form_access FROM users WHERE id = $1', [decoded.id]);
      const user = result.rows[0];
      if (!user) return res.status(403).json({ error: 'Forbidden' });
      const forms = user.form_access ? user.form_access.split(',') : [];
      if (!forms.includes(formName) && decoded.role !== 'admin') return res.status(403).json({ error: 'No access' });
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = { router, requireFormAccess };
