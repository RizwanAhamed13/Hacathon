const express = require('express');
const router = express.Router();

const pool = require('./database');

// Test database connection for Inspection Register
pool.connect((err, client, done) => {
    if (err) {
        console.error('InspectionRegisterRoutes - Database connection test failed:', err.stack);
    } else {
        console.log('InspectionRegisterRoutes - Database connected successfully');
        done();
    }
});


// POST endpoint to submit Inspection Register data
router.post('/api/inspection-register', async (req, res) => {
  const { inspection_date, shift, inspector_name, item_description, inspection_time, defects_and_quantity } = req.body;
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
      `INSERT INTO inspection_register (inspection_date, shift, inspector_name, item_description, inspection_time, defects_and_quantity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [inspection_date, shift, inspector_name, item_description, inspection_time, defects_and_quantity]
    );
    await client.query('COMMIT');
    if (result.rowCount === 1) {
      res.status(201).json({
        message: 'Inspection Register data submitted successfully',
        record: result.rows[0]
      });
    } else {
      res.status(500).json({ error: 'Failed to insert Inspection Register data' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting Inspection Register data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    client.release();
  }
});

// GET endpoint to retrieve all Inspection Register records
router.get('/api/inspection-register', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inspection_register ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching Inspection Register data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;