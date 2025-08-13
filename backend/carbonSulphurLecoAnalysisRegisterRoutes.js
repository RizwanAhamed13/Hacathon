const express = require('express');
const router = express.Router();
const pool = require('./database');
// Test database connection for Carbon Sulphur Leco Analysis Register
pool.connect((err, client, done) => {
    if (err) {
        console.error('CarbonSulphurLecoAnalysisRegisterRoutes - Database connection test failed:', err.stack);
    } else {
        console.log('CarbonSulphurLecoAnalysisRegisterRoutes - Database connected successfully');
        done();
    }
});

// Get all records
router.get('/api/carbon-sulphur-leco-analysis-register', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "CARBON - SULPHUR (LECO) ANALYSIS REGISTER" ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create a new record
router.post('/api/carbon-sulphur-leco-analysis-register', async (req, res) => {
  const { date, part_name, identification_data_heat_code, leco_c_percent, leco_s_percent, spectro_c_percent, spectro_s_percent, tested_by, approved_by, remarks } = req.body;
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
      `INSERT INTO "CARBON - SULPHUR (LECO) ANALYSIS REGISTER" (date, part_name, identification_data_heat_code, leco_c_percent, leco_s_percent, spectro_c_percent, spectro_s_percent, tested_by, approved_by, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [date, part_name, identification_data_heat_code, leco_c_percent, leco_s_percent, spectro_c_percent, spectro_s_percent, tested_by, approved_by, remarks]
    );
    await client.query('COMMIT');
    if (result.rowCount === 1) {
      res.status(201).json({
        message: 'Carbon Sulphur Leco Analysis Register data submitted successfully',
        record: result.rows[0]
      });
    } else {
      res.status(500).json({ error: 'Failed to insert Carbon Sulphur Leco Analysis Register data' });
      console.error("🔥 Error in /carbon-sulphur-leco-analysis-register route:", err);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create record' });
    console.error("🔥 Error in /carbon-sulphur-leco-analysis-register route:", err);
  } finally {
    client.release();
  }
});

module.exports = router;