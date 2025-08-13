const express = require('express');
const router = express.Router();
const pool = require('./database');
// Test database connection for Rejection Analysis Register
pool.connect((err, client, done) => {
    if (err) {
        console.error('RejectionAnalysisRegisterRoutes - Database connection test failed:', err.stack);
    } else {
        console.log('RejectionAnalysisRegisterRoutes - Database connected successfully');
        done();
    }
});

// Get all records
router.get('/api/rejection-analysis-register', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "REJECTION ANALYSIS REGISTER" ORDER BY record_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create a new record
router.post('/api/rejection-analysis-register', async (req, res) => {
  const { record_date, component_name, ins_qty, rej_qty, rej_percentage, date_code, bh, ph, sd, mb, mc, scab, sk, xr, sp, og, dt, cb, mck, gl, sl } = req.body;
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
      `INSERT INTO "REJECTION ANALYSIS REGISTER" (record_date, component_name, ins_qty, rej_qty, rej_percentage, date_code, bh, ph, sd, mb, mc, scab, sk, xr, sp, og, dt, cb, mck, gl, sl)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [record_date, component_name, ins_qty, rej_qty, rej_percentage, date_code, bh, ph, sd, mb, mc, scab, sk, xr, sp, og, dt, cb, mck, gl, sl]
    );
    await client.query('COMMIT');
    if (result.rowCount === 1) {
      res.status(201).json({
        message: 'Rejection Analysis Register data submitted successfully',
        record: result.rows[0]
      });
    } else {
      res.status(500).json({ error: 'Failed to insert Rejection Analysis Register data' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create record' });
  } finally {
    client.release();
  }
});

module.exports = router;