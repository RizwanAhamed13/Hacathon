const express = require('express');
const router = express.Router();
const pool = require('./database');
// Test database connection for Hardness Test Record
pool.connect((err, client, done) => {
    if (err) {
        console.error('HardnessTestRecordRoutes - Database connection test failed:', err.stack);
    } else {
        console.log('HardnessTestRecordRoutes - Database connected successfully');
        done();
    }
});

// Get all records
router.get('/api/hardness-test-record', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Hardness Test Record" ORDER BY test_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create a new record
router.post('/api/hardness-test-record', async (req, res) => {
  const { test_date, part_name, identification_data, heat_code, tested_value, average_value, remarks } = req.body;
  // Get user from JWT
  let userName = 'unknown';
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      userName = decoded.username || decoded.id || 'unknown';
    } catch {}
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user', $1, true)", [userName]);
    const result = await client.query(
      `INSERT INTO "Hardness Test Record" (test_date, part_name, identification_data, heat_code, tested_value, average_value, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [test_date, part_name, identification_data, heat_code, tested_value, average_value, remarks]
    );
    await client.query('COMMIT');
    if (result.rowCount === 1) {
      res.status(201).json({
        message: 'Hardness Test Record data submitted successfully',
        record: result.rows[0]
      });
    } else {
      res.status(500).json({ error: 'Failed to insert Hardness Test Record data' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create record' });
    console.error("🔥 Error in /hardness-test-record route:", err);
  } finally {
    client.release();
  }
});

module.exports = router;