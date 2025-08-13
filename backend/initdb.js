const pool = require('./database');


// Test database connection for InitDB
pool.connect((err, client, done) => {
    if (err) {
        console.error('InitDB - Database connection test failed:', err.stack);
    } else {
        console.log('InitDB - Database connected successfully');
        done();
    }
});


async function initializeDatabase() {
  // --- AUDIT LOG SYSTEM ---
  // Create audit_log table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      audit_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_name TEXT,
      action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
      table_name TEXT NOT NULL,
      record_pk TEXT NOT NULL,
      old_data JSONB,
      new_data JSONB,
      changes_summary JSONB
    );
  `);

  // Add indexes for fast searching
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_pk);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_user_name ON audit_log(user_name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(audit_timestamp);`);

  // jsonb_diff_val function
  await pool.query(`
    CREATE OR REPLACE FUNCTION jsonb_diff_val(val1 JSONB, val2 JSONB)
    RETURNS JSONB AS $$
    DECLARE
      result JSONB;
      v RECORD;
    BEGIN
       result = val2;
       FOR v IN SELECT * FROM jsonb_each(val1) LOOP
         IF result @> jsonb_build_object(v.key,v.value)
            THEN result = result - v.key;
         ELSIF NOT result ? v.key
            THEN result = result || jsonb_build_object(v.key,'null');
         END IF;
       END LOOP;
       RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // log_changes function
  await pool.query(`
    CREATE OR REPLACE FUNCTION log_changes()
    RETURNS TRIGGER AS $$
    DECLARE
        pk_column_name TEXT;
        pk_column_value TEXT;
    BEGIN
        SELECT c.column_name
        INTO pk_column_name
        FROM information_schema.key_column_usage AS c
        LEFT JOIN information_schema.table_constraints AS t
          ON t.constraint_name = c.constraint_name
        WHERE t.table_name = TG_TABLE_NAME AND t.constraint_type = 'PRIMARY KEY'
        LIMIT 1;

        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
            EXECUTE format('SELECT ($1).%I::text', pk_column_name)
            INTO pk_column_value
            USING OLD;
        ELSE
            EXECUTE format('SELECT ($1).%I::text', pk_column_name)
            INTO pk_column_value
            USING NEW;
        END IF;

        INSERT INTO audit_log (
            user_name,
            action_type,
            table_name,
            record_pk,
            old_data,
            new_data,
            changes_summary
        )
        VALUES (
            current_setting('app.current_user', true),
            TG_OP,
            TG_TABLE_NAME,
            pk_column_value,
            CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
            CASE WHEN TG_OP = 'UPDATE' THEN jsonb_diff_val(to_jsonb(OLD), to_jsonb(NEW)) ELSE NULL END
        );

        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Triggers for all main tables
  const auditTables = [
    'qc_register',
    'inspection_register',
    'tensile_test_report',
    'microstructure_analysis',
    'time_study_process',
    'online_micro_coupon_inspection',
    'master_data',
    'recently_used_products',
    'Hardness Test Record',
    'CARBON - SULPHUR (LECO) ANALYSIS REGISTER',
    'QF 07 FBQ - 02',
    'QF 07 FBQ - 03',
    'IMPACT TEST REPORT',
    'REJECTION ANALYSIS REGISTER',
    'INSPECTION RESULT REPORT',
    'ERROR PROOF VERIFICATION CHECK LIST - FDY'
  ];
  for (const table of auditTables) {
    const triggerName = table.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_audit';
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = '${triggerName}'
        ) THEN
          EXECUTE 'CREATE TRIGGER ${triggerName}
            AFTER INSERT OR UPDATE OR DELETE ON "${table}"
            FOR EACH ROW EXECUTE FUNCTION log_changes();';
        END IF;
      END
      $$;
    `);
  }
  // --- END AUDIT LOG SYSTEM ---
  // master_data
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_data (
      product_code VARCHAR(20) PRIMARY KEY,
      s_no SERIAL,
      product_description VARCHAR(255) NOT NULL,
      grade VARCHAR(10),
      prod_group VARCHAR(255),
      last_used TIMESTAMPTZ
    );
  `);

  // QF 07 FBQ - 02
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "QF 07 FBQ - 02" (
      id SERIAL PRIMARY KEY,
      record_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      component_in_production VARCHAR(20) REFERENCES master_data(product_code) NOT NULL,
      flow_rate_setting_a DECIMAL,
      flow_rate_display_b DECIMAL,
      hot_box_temp DECIMAL,
      air_pressure DECIMAL,
      inject_pressure DECIMAL,
      feed_pipe_condition TEXT,
      powder_size DECIMAL,
      moisture DECIMAL,
      is_new_bag BOOLEAN DEFAULT FALSE,
      air_drier_function BOOLEAN,
      filter_cleaning BOOLEAN,
      gauge_test DECIMAL,
      signature TEXT,
      hourly_time TIMESTAMPTZ,
      micro_structure VARCHAR(100) DEFAULT 'Inoculation System Checks',
      macro_structure VARCHAR(100) DEFAULT 'Pre-Process'
    );
  `);

  // inspection_register
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspection_register (
      id SERIAL PRIMARY KEY,
      inspection_date DATE NOT NULL,
      shift VARCHAR(50),
      inspector_name TEXT NOT NULL,
      item_description TEXT NOT NULL,
      inspection_time TIME,
      defects_and_quantity TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // qc_register
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qc_register (
      id SERIAL PRIMARY KEY,
      record_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      record_date DATE NOT NULL,
      disa_line VARCHAR(20),
      part_name VARCHAR(100) NOT NULL,
      heat_code VARCHAR(50) NOT NULL,
      qty_moulds INTEGER,
      remarks TEXT,
      c1 FLOAT,
      si1 FLOAT,
      mn1 FLOAT,
      p1 FLOAT,
      s1 FLOAT,
      mg1 FLOAT,
      f_l1 FLOAT,
      cu1 FLOAT,
      cr1 FLOAT,
      c2 FLOAT,
      si2 FLOAT,
      mn2 FLOAT,
      s2 FLOAT,
      cr2 FLOAT,
      cu2 FLOAT,
      sn2 FLOAT,
      pouring_time TIME,
      pouring_temp FLOAT,
      pp_code VARCHAR(20),
      fc_no_heat_no VARCHAR(50),
      mg_kgs FLOAT,
      res_mg FLOAT,
      converter_percent FLOAT,
      rec_mg_percent FLOAT,
      stream_innoculat FLOAT,
      p_time_sec FLOAT,
      treatment_no VARCHAR(20),
      con_no VARCHAR(20),
      tapping_time TIME,
      corrective_addition_kgs FLOAT,
      tapping_wt_kgs FLOAT
    );
  `);
  // tensile_test_report
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tensile_test_report (
      id SERIAL PRIMARY KEY,
      test_date DATE NOT NULL,
      item VARCHAR(255) NOT NULL,
      heat_code VARCHAR(100),
      diameter_mm NUMERIC(10,2),
      initial_length_mm NUMERIC(10,2),
      final_length_mm NUMERIC(10,2),
      breaking_load_kn NUMERIC(10,2),
      yield_load_kn NUMERIC(10,2),
      uts_n_mm2 NUMERIC(10,2),
      ys_n_mm2 NUMERIC(10,2),
      elongation_percent NUMERIC(5,2),
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create disa_line table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS disa_line (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL
    );
  `);

  // Insert initial disa_line values if not present
  await pool.query(`
    INSERT INTO disa_line (name)
    VALUES ('DISA-I'), ('DISA-II'), ('DISA-III'), ('DISA-IV')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Create microstructure_analysis table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS microstructure_analysis (
      id SERIAL PRIMARY KEY,
      analysis_date DATE NOT NULL,
      part_name VARCHAR(255) NOT NULL,
      date_code VARCHAR(255),
      heat_code VARCHAR(255),
      nodularity_percentage NUMERIC(5, 2),
      graphite_type VARCHAR(255),
      count_per_mm2 INT,
      size VARCHAR(50),
      ferrite_percentage NUMERIC(5, 2),
      pearlite_percentage NUMERIC(5, 2),
      carbide VARCHAR(255),
      remarks TEXT,
      disa_line_id INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_disa_line FOREIGN KEY(disa_line_id) REFERENCES disa_line(id)
    );
  `);

  // QF 07 FBQ - 03
await pool.query(`
  CREATE TABLE IF NOT EXISTS "QF 07 FBQ - 03" (
    id SERIAL PRIMARY KEY,
    component_in_production VARCHAR(20) REFERENCES master_data(product_code) NOT NULL,
    inoculation_flow_rate_rpm DECIMAL,
    inoculation_flow_rate_gms DECIMAL,
    air_pressure DECIMAL CHECK (air_pressure >= 4.0),
    inject_pressure DECIMAL CHECK (inject_pressure <= 2.0),
    feed_pipe_condition TEXT,
    air_line_water_drainage BOOLEAN,
    hopper_cleaning BOOLEAN,
    inoculant_powder_size DECIMAL,
    inoculant_powder_moisture DECIMAL,
    is_new_bag BOOLEAN DEFAULT FALSE,
    gauge_test DECIMAL,
    micro_structure VARCHAR(100) DEFAULT 'Inoculation System Checks',
    macro_structure VARCHAR(100) DEFAULT 'Pre-Process'
  );
`);

  // recently_used_products
await pool.query(`
  CREATE TABLE IF NOT EXISTS recently_used_products (
    user_id VARCHAR(50),
    product_code VARCHAR(20) REFERENCES master_data(product_code),
    last_used TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_code)
  );
`);

  // time_study_process
await pool.query(`
  CREATE TABLE IF NOT EXISTS time_study_process (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shift VARCHAR(10),
    part_name VARCHAR(100) NOT NULL,
    heat_code VARCHAR(50) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    c FLOAT,
    si FLOAT,
    mn FLOAT,
    p FLOAT,
    s FLOAT,
    cr FLOAT,
    ni FLOAT,
    al FLOAT,
    cu FLOAT,
    sn FLOAT,
    mo FLOAT,
    cac2_s FLOAT,
    fesi_sh FLOAT,
    femn_sic FLOAT,
    cu_fecr FLOAT,
    carbon_steel VARCHAR(50),
    micro_structure VARCHAR(100) DEFAULT 'Melting/Pouring Control',
    macro_structure VARCHAR(100) DEFAULT 'In-Process Documents',
    mn1 FLOAT,
    p1 FLOAT,
    s1 FLOAT,
    mg1 FLOAT,
    f_l1 FLOAT,
    cu1 FLOAT,
    cr1 FLOAT,
    c2 FLOAT,
    si2 FLOAT,
    mn2 FLOAT,
    s2 FLOAT,
    cr2 FLOAT,
    cu2 FLOAT,
    sn2 FLOAT,
    pouring_time TIME,
    pouring_temp FLOAT,
    pp_code VARCHAR(20),
    fc_no_heat_no VARCHAR(50),
    mg_kgs FLOAT,
    res_mg FLOAT,
    converter_percent FLOAT,
    rec_mg_percent FLOAT,
    stream_innoculat FLOAT,
    p_time_sec FLOAT,
    treatment_no VARCHAR(20),
    con_no VARCHAR(20),
    tapping_time TIME,
    corrective_addition_kgs FLOAT
  );
`);
  // ...existing code...

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_micro_coupon_inspection (
      id SERIAL PRIMARY KEY,
      record_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      disa VARCHAR(255),
      pp_code VARCHAR(255),
      item_description TEXT,
      nodularity_percentage DECIMAL(5, 2),
      remarks TEXT,
      micro_structure VARCHAR(100) DEFAULT 'Micro Structure Analysis',
      macro_structure VARCHAR(100) DEFAULT 'Quality Control'
    );
  `);

    // IMPACT TEST REPORT
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "IMPACT TEST REPORT" (
      id SERIAL PRIMARY KEY,
      inspection_date DATE NOT NULL,
      part_name VARCHAR(255) NOT NULL,
      date_code VARCHAR(50),
      specification TEXT,
      observed_value NUMERIC(10, 2) CHECK (observed_value >= 0),
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // REJECTION ANALYSIS REGISTER
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "REJECTION ANALYSIS REGISTER" (
      id SERIAL PRIMARY KEY,
      record_date DATE NOT NULL,
      component_name VARCHAR(255) NOT NULL,
      ins_qty INT CHECK (ins_qty >= 0),
      rej_qty INT CHECK (rej_qty >= 0),
      rej_percentage NUMERIC(5, 2) CHECK (rej_percentage >= 0 AND rej_percentage <= 100),
      date_code VARCHAR(50),
      bh INT CHECK (bh >= 0),
      ph INT CHECK (ph >= 0),
      sd INT CHECK (sd >= 0),
      mb INT CHECK (mb >= 0),
      mc INT CHECK (mc >= 0),
      scab INT CHECK (scab >= 0),
      sk INT CHECK (sk >= 0),
      xr INT CHECK (xr >= 0),
      sp INT CHECK (sp >= 0),
      og INT CHECK (og >= 0),
      dt INT CHECK (dt >= 0),
      cb INT CHECK (cb >= 0),
      mck INT CHECK (mck >= 0),
      gl INT CHECK (gl >= 0),
      sl INT CHECK (sl >= 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // INSPECTION RESULT REPORT
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "INSPECTION RESULT REPORT" (
      id SERIAL PRIMARY KEY,
      month VARCHAR(20) NOT NULL,
      part_name VARCHAR(255) NOT NULL,
      part_no VARCHAR(100) NOT NULL,
      cat VARCHAR(50),
      model VARCHAR(100),
      vendor_name VARCHAR(255),
      issue_date DATE,
      check_item TEXT,
      specification TEXT,
      data_code_1 VARCHAR(50),
      data_code_2 VARCHAR(50),
      data_code_3 VARCHAR(50),
      data_code_4 VARCHAR(50),
      data_code_5 VARCHAR(50),
      data_code_6 VARCHAR(50),
      data_code_7 VARCHAR(50),
      data_code_8 VARCHAR(50),
      data_code_9 VARCHAR(50),
      data_code_10 VARCHAR(50),
      remark TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

// ERROR PROOF VERIFICATION CHECK LIST - FDY
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ERROR PROOF VERIFICATION CHECK LIST - FDY" (
      id SERIAL PRIMARY KEY,
      line VARCHAR(50) NOT NULL,
      serial_no INT NOT NULL CHECK (serial_no > 0),
      error_proof_no VARCHAR(50) NOT NULL,
      error_proof_name VARCHAR(255) NOT NULL,
      verification_date_shift VARCHAR(100) NOT NULL,
      nature_of_error_proof TEXT,
      frequency VARCHAR(50) NOT NULL,
      date1_shift1_obs TEXT,
      date1_shift2_obs TEXT,
      date1_shift3_obs TEXT,
      date2_shift1_obs TEXT,
      date2_shift2_obs TEXT,
      date2_shift3_obs TEXT,
      date3_shift1_obs TEXT,
      date3_shift2_obs TEXT,
      date3_shift3_obs TEXT,
      problem TEXT,
      root_cause TEXT,
      corrective_action TEXT,
      status VARCHAR(50) CHECK (status IN ('Open', 'In Progress', 'Closed')),
      reviewed_by VARCHAR(255),
      approved_by VARCHAR(255),
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Hardness Test Record
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Hardness Test Record" (
      id SERIAL PRIMARY KEY,
      test_date DATE NOT NULL,
      part_name VARCHAR(255) NOT NULL,
      identification_data VARCHAR(100),
      heat_code VARCHAR(100),
      tested_value NUMERIC(10, 2) CHECK (tested_value >= 0),
      average_value NUMERIC(10, 2) CHECK (average_value >= 0),
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // CARBON - SULPHUR (LECO) ANALYSIS REGISTER
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "CARBON - SULPHUR (LECO) ANALYSIS REGISTER" (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      part_name VARCHAR(255) NOT NULL,
      identification_data_heat_code VARCHAR(255) NOT NULL,
      leco_c_percent NUMERIC(5, 2) CHECK (leco_c_percent >= 0),
      leco_s_percent NUMERIC(5, 2) CHECK (leco_s_percent >= 0),
      spectro_c_percent NUMERIC(5, 2) CHECK (spectro_c_percent >= 0),
      spectro_s_percent NUMERIC(5, 2) CHECK (spectro_s_percent >= 0),
      tested_by VARCHAR(255),
      approved_by VARCHAR(255),
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized: All tables are ensured.');
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(err => { console.error('DB Init Error:', err); process.exit(1); });
}

module.exports = initializeDatabase;

