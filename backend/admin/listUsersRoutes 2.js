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

// List audit log entries
router.get('/audit-log', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, audit_timestamp, user_name, action_type, table_name, record_pk, changes_summary FROM audit_log ORDER BY audit_timestamp DESC LIMIT 100');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit log entries' });
  }
});

module.exports = router;
