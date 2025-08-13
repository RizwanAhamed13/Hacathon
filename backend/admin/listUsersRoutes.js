const express = require('express');
const pool = require('../auth/userModel');
const router = express.Router();

// List all users except admin
router.get('/list-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, form_access FROM users');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
