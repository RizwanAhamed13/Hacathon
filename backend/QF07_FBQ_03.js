const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
// pool = require('./database');
const dotenv = require('dotenv');

// Load environment variables from the project root
dotenv.config({ path: '../.env' });

// Create the database pool with environment variables
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432,
});

// Test connection at startup
pool.connect((err, client, done) => {
  if (err) {
    console.error('QF07_FBQ_03 - Database connection test failed:', err.stack);
  } else {
    console.log('QF07_FBQ_03 - Database connected successfully');
    done();
  }
});


// Unified endpoint for all QC FBQ03 event types

// Unified endpoint for all QC FBQ03 parameters (no event_type required)
router.post('/api/qc/fbq03', async (req, res) => {
  try {
    const {
      component_in_production,
      inoculation_flow_rate_rpm,
      inoculation_flow_rate_gms,
      air_pressure,
      inject_pressure,
      feed_pipe_condition,
      air_line_water_drainage,
      hopper_cleaning,
      inoculant_powder_size,
      inoculant_powder_moisture,
      is_new_bag,
      gauge_test
    } = req.body;

    const micro_structure = 'Inoculation System Checks';
    const macro_structure = 'Pre-Process';

    if (!component_in_production) {
      return res.status(400).json({ error: 'component_in_production is required' });
    }

    if (inject_pressure && inject_pressure > 2.0) {
      return res.status(400).json({ error: "Inject Pressure cannot exceed 2.0 bar" });
    }

    const query = `
      INSERT INTO "QF 07 FBQ - 03" (
        component_in_production,
        inoculation_flow_rate_rpm,
        inoculation_flow_rate_gms,
        air_pressure,
        inject_pressure,
        feed_pipe_condition,
        air_line_water_drainage,
        hopper_cleaning,
        inoculant_powder_size,
        inoculant_powder_moisture,
        is_new_bag,
        gauge_test,
        micro_structure,
        macro_structure
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      component_in_production || null,
      inoculation_flow_rate_rpm || null,
      inoculation_flow_rate_gms || null,
      air_pressure || null,
      inject_pressure || null,
      feed_pipe_condition || null,
      air_line_water_drainage || null,
      hopper_cleaning || null,
      inoculant_powder_size || null,
      inoculant_powder_moisture || null,
      (is_new_bag === true || is_new_bag === 'true' || is_new_bag === 'Done' || is_new_bag === 1) ? true :
      (is_new_bag === false || is_new_bag === 'false' || is_new_bag === 0) ? false :
      (is_new_bag == null ? null : false),
      gauge_test || null,
      micro_structure,
      macro_structure
    ];

    // Get user from JWT for audit
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
      const newRecord = await client.query(query, values);
      await client.query(
        `UPDATE master_data 
         SET last_used = NOW() 
         WHERE product_code = $1`,
        [component_in_production]
      );
      await client.query('COMMIT');
      res.json(newRecord.rows[0]);
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error submitting QC FBQ03 data:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get all QC records for a component
router.get('/api/qc/fbq03/:component', async (req, res) => {
  try {
    const { component } = req.params;
    
    const query = `
      SELECT * FROM "QF 07 FBQ - 03"
      WHERE component_in_production = $1
      ORDER BY event_time DESC
    `;
    
    const result = await pool.query(query, [component]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching QC records:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Removed /api/qc/fbq03/:component/:eventType route because event_type column does not exist

// Get latest record for a component
router.get('/api/qc/fbq03/latest/:component', async (req, res) => {
  try {
    const { component } = req.params;
    
    const query = `
      SELECT * FROM "QF 07 FBQ - 03"
      WHERE component_in_production = $1
      ORDER BY event_time DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [component]);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching latest QC record:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get all master data
router.get('/api/master-data', async (req, res) => {
  try {
    const query = 'SELECT * FROM master_data';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching master data:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;