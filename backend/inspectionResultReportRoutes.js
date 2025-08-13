const express = require('express');
const router = express.Router();
const pool = require('./database');
// Test database connection for Inspection Result Report
pool.connect((err, client, done) => {
    if (err) {
        console.error('InspectionResultReportRoutes - Database connection test failed:', err.stack);
    } else {
        console.log('InspectionResultReportRoutes - Database connected successfully');
        done();
    }
});

// Get all records
router.get('/api/inspection-result-report', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "INSPECTION RESULT REPORT" ORDER BY month DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create a new record
router.post('/api/inspection-result-report', async (req, res) => {
  const { month, part_name, part_no, cat, model, vendor_name, issue_date, check_item, specification, data_code_1, data_code_2, data_code_3, data_code_4, data_code_5, data_code_6, data_code_7, data_code_8, data_code_9, data_code_10, remark } = req.body;
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
      `INSERT INTO "INSPECTION RESULT REPORT" (month, part_name, part_no, cat, model, vendor_name, issue_date, check_item, specification, data_code_1, data_code_2, data_code_3, data_code_4, data_code_5, data_code_6, data_code_7, data_code_8, data_code_9, data_code_10, remark)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [month, part_name, part_no, cat, model, vendor_name, issue_date, check_item, specification, data_code_1, data_code_2, data_code_3, data_code_4, data_code_5, data_code_6, data_code_7, data_code_8, data_code_9, data_code_10, remark]
    );
    await client.query('COMMIT');
    if (result.rowCount === 1) {
      res.status(201).json({
        message: 'Inspection Result Report data submitted successfully',
        record: result.rows[0]
      });
    } else {
      res.status(500).json({ error: 'Failed to insert Inspection Result Report data' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create record' });
    console.error("🔥 Error in /inspection-result-report route:", err);
  } finally {
    client.release();
  }
});

module.exports = router;