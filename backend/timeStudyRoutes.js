const express = require('express');
const router = express.Router();
const pool = require('./database');

// Test database connection for Time Study
pool.connect((err, client, done) => {
    if (err) {
        console.error('TimeStudyRoutes - Database connection test failed:', err.stack);
    } else {
        console.log('TimeStudyRoutes - Database connected successfully');
        done();
    }
});

// POST endpoint to submit time study data
router.post('/api/time-study', async (req, res) => {
    const {
        shift,
        c, si, mn, p, s, cr, ni, al, cu, sn, mo,
        cac2_s, fesi_sh, femn_sic, cu_fecr,
        carbon_steel,
        part_name, heat_code, grade
    } = req.body;
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
        `INSERT INTO time_study_process (
            shift,
            c, si, mn, p, s, cr, ni, al, cu, sn, mo,
            cac2_s, fesi_sh, femn_sic, cu_fecr,
            carbon_steel,
            part_name, heat_code, grade
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
            shift,
            c, si, mn, p, s, cr, ni, al, cu, sn, mo,
            cac2_s, fesi_sh, femn_sic, cu_fecr,
            carbon_steel,
            part_name, heat_code, grade
        ]
      );
      await client.query('COMMIT');
      if (result.rowCount === 1) {
        res.status(201).json({
          message: 'Time study data successfully recorded',
          record: result.rows[0]
        });
      } else {
        res.status(500).json({ error: 'Failed to insert time study data' });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error inserting time study data:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
      client.release();
    }
    });

    // ✅ Get last 5 time study records
router.get('/api/time-study/records', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
          id,
          shift,
          c, si, mn, p, s, cr, ni, al, cu, sn, mo,
          cac2_s, fesi_sh, femn_sic, cu_fecr,
          carbon_steel,
          part_name, heat_code, grade,
          timestamp   -- ✅ use raw timestamp instead of to_char
      FROM time_study_process
      ORDER BY id DESC
      LIMIT 5;
    `);

    res.json(result.rows); // ✅ Always return an array
  } catch (error) {
    console.error('❌ Error fetching time study records:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, stack: error.stack });
  }
});




module.exports = router;