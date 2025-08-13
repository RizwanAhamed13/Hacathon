const express = require('express');
const router = express.Router();
const pool = require('./database');

// Add form access middleware to allow non-admin users with LOTO access
const { requireFormAccess } = require('./auth/authRoutes');

// Auto-migration to ensure workflow columns exist (LOTO only)
let workflowEnsured = false;
async function ensureWorkflowColumns(client) {
  if (workflowEnsured) return;
  try {
    await client.query('SELECT status FROM "LOTO Work Permit" LIMIT 1');
    workflowEnsured = true;
  } catch {
    await client.query(`
      ALTER TABLE "LOTO Work Permit"
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING_BAY',
        ADD COLUMN IF NOT EXISTS current_approver_role VARCHAR(50) DEFAULT 'bay_manager',
        ADD COLUMN IF NOT EXISTS bay_manager_approved_by TEXT,
        ADD COLUMN IF NOT EXISTS bay_manager_approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS maintenance_incharge_approved_by TEXT,
        ADD COLUMN IF NOT EXISTS maintenance_incharge_approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS safety_incharge_approved_by TEXT,
        ADD COLUMN IF NOT EXISTS safety_incharge_approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejected_by TEXT,
        ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);
    workflowEnsured = true;
  }
}

// Test connection for LOTO
pool.connect((err, client, done) => {
  if (err) {
    console.error('LOTO Work Permit - DB connection failed:', err.stack);
  } else {
    console.log('LOTO Work Permit - DB connected successfully');
    done();
  }
});

// Get all records
router.get('/api/loto-work-permit', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "LOTO Work Permit" ORDER BY permit_date DESC, id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch LOTO records:', err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Create a new record - allow users with LOTO access (or admin)
router.post('/api/loto-work-permit', requireFormAccess('LOTO Work Permit'), async (req, res) => {
  const {
    bd_slip_no,
    permit_date,
    permit_issuing_time,
    permit_closing_time,
    shift,
    plant,
    department,
    bay_no,
    line_name,
    machine_no,

    presence_of_bay_manager_shift1,
    presence_of_bay_manager_shift2,
    presence_of_bay_manager_shift3,

    presence_of_maintenance_incharge_shift1,
    presence_of_maintenance_incharge_shift2,
    presence_of_maintenance_incharge_shift3,

    no_of_persons_working_in_machine_shift1,
    no_of_persons_working_in_machine_shift2,
    no_of_persons_working_in_machine_shift3,

    emergency_switch_operator_panel_off_condition_shift1,
    emergency_switch_operator_panel_off_condition_shift2,
    emergency_switch_operator_panel_off_condition_shift3,

    emergency_switch_cycle_start_panel_off_condition_shift1,
    emergency_switch_cycle_start_panel_off_condition_shift2,
    emergency_switch_cycle_start_panel_off_condition_shift3,

    emergency_switch_conveyor_panel_off_condition_shift1,
    emergency_switch_conveyor_panel_off_condition_shift2,
    emergency_switch_conveyor_panel_off_condition_shift3,

    mcb_off_lock_condition_shift1,
    mcb_off_lock_condition_shift2,
    mcb_off_lock_condition_shift3,

    air_line_close_condition_shift1,
    air_line_close_condition_shift2,
    air_line_close_condition_shift3,

    men_at_work_board_mcb_panel_shift1,
    men_at_work_board_mcb_panel_shift2,
    men_at_work_board_mcb_panel_shift3,

    men_at_work_do_not_operate_machine_board_operator_panel_shift1,
    men_at_work_do_not_operate_machine_board_operator_panel_shift2,
    men_at_work_do_not_operate_machine_board_operator_panel_shift3,

    men_at_work_board_air_valve_shift1,
    men_at_work_board_air_valve_shift2,
    men_at_work_board_air_valve_shift3
  } = req.body;

  // Get user from JWT for audit
  let userName = 'unknown';
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      userName = decoded.username || decoded.id || userName;
    } catch {}
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user', $1, true)", [userName]);

    const result = await client.query(
      `INSERT INTO "LOTO Work Permit" (
        bd_slip_no, permit_date, permit_issuing_time, permit_closing_time, shift, plant, department, bay_no, line_name, machine_no,
        presence_of_bay_manager_shift1, presence_of_bay_manager_shift2, presence_of_bay_manager_shift3,
        presence_of_maintenance_incharge_shift1, presence_of_maintenance_incharge_shift2, presence_of_maintenance_incharge_shift3,
        no_of_persons_working_in_machine_shift1, no_of_persons_working_in_machine_shift2, no_of_persons_working_in_machine_shift3,
        emergency_switch_operator_panel_off_condition_shift1, emergency_switch_operator_panel_off_condition_shift2, emergency_switch_operator_panel_off_condition_shift3,
        emergency_switch_cycle_start_panel_off_condition_shift1, emergency_switch_cycle_start_panel_off_condition_shift2, emergency_switch_cycle_start_panel_off_condition_shift3,
        emergency_switch_conveyor_panel_off_condition_shift1, emergency_switch_conveyor_panel_off_condition_shift2, emergency_switch_conveyor_panel_off_condition_shift3,
        mcb_off_lock_condition_shift1, mcb_off_lock_condition_shift2, mcb_off_lock_condition_shift3,
        air_line_close_condition_shift1, air_line_close_condition_shift2, air_line_close_condition_shift3,
        men_at_work_board_mcb_panel_shift1, men_at_work_board_mcb_panel_shift2, men_at_work_board_mcb_panel_shift3,
        men_at_work_do_not_operate_machine_board_operator_panel_shift1, men_at_work_do_not_operate_machine_board_operator_panel_shift2, men_at_work_do_not_operate_machine_board_operator_panel_shift3,
        men_at_work_board_air_valve_shift1, men_at_work_board_air_valve_shift2, men_at_work_board_air_valve_shift3
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,
        $14,$15,$16,
        $17,$18,$19,
        $20,$21,$22,
        $23,$24,$25,
        $26,$27,$28,
        $29,$30,$31,
        $32,$33,$34,
        $35,$36,$37,
        $38,$39,$40,
        $41,$42,$43
      ) RETURNING *` ,
      [
        bd_slip_no, permit_date, permit_issuing_time, permit_closing_time, shift, plant, department, bay_no, line_name, machine_no,
        presence_of_bay_manager_shift1, presence_of_bay_manager_shift2, presence_of_bay_manager_shift3,
        presence_of_maintenance_incharge_shift1, presence_of_maintenance_incharge_shift2, presence_of_maintenance_incharge_shift3,
        no_of_persons_working_in_machine_shift1, no_of_persons_working_in_machine_shift2, no_of_persons_working_in_machine_shift3,
        emergency_switch_operator_panel_off_condition_shift1, emergency_switch_operator_panel_off_condition_shift2, emergency_switch_operator_panel_off_condition_shift3,
        emergency_switch_cycle_start_panel_off_condition_shift1, emergency_switch_cycle_start_panel_off_condition_shift2, emergency_switch_cycle_start_panel_off_condition_shift3,
        emergency_switch_conveyor_panel_off_condition_shift1, emergency_switch_conveyor_panel_off_condition_shift2, emergency_switch_conveyor_panel_off_condition_shift3,
        mcb_off_lock_condition_shift1, mcb_off_lock_condition_shift2, mcb_off_lock_condition_shift3,
        air_line_close_condition_shift1, air_line_close_condition_shift2, air_line_close_condition_shift3,
        men_at_work_board_mcb_panel_shift1, men_at_work_board_mcb_panel_shift2, men_at_work_board_mcb_panel_shift3,
        men_at_work_do_not_operate_machine_board_operator_panel_shift1, men_at_work_do_not_operate_machine_board_operator_panel_shift2, men_at_work_do_not_operate_machine_board_operator_panel_shift3,
        men_at_work_board_air_valve_shift1, men_at_work_board_air_valve_shift2, men_at_work_board_air_valve_shift3
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'LOTO Work Permit submitted successfully', record: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create LOTO record:', err);
    res.status(500).json({ error: 'Failed to create record' });
  } finally {
    client.release();
  }
});

// --- LOTO Approval Workflow (bay_manager -> maintenance_incharge -> safety_incharge) ---
function getUserFromAuth(req) {
  let userName = 'unknown';
  let role = 'user';
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      userName = decoded.username || decoded.id || 'unknown';
      role = decoded.role || role;
    } catch {}
  }
  return { userName, role };
}

// Approve step
router.post('/api/loto-work-permit/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { userName, role } = getUserFromAuth(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user', $1, true)", [userName]);
    await ensureWorkflowColumns(client);

    const { rows } = await client.query('SELECT status, current_approver_role FROM "LOTO Work Permit" WHERE id = $1 FOR UPDATE', [id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    const { status, current_approver_role } = rows[0];
    if (status === 'APPROVED' || status === 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already finalized' });
    }
    // Enforce only current approver can approve
    const expectedRole = current_approver_role || (status === 'PENDING_BAY' ? 'bay_manager' : status === 'PENDING_MAINTENANCE' ? 'maintenance_incharge' : 'safety_incharge');
    if (role !== expectedRole && role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not permitted for this step' });
    }

    let query, nextStatus;
    if (status === 'PENDING_BAY') {
      nextStatus = 'PENDING_MAINTENANCE';
      query = `UPDATE "LOTO Work Permit" SET 
        status = $2, current_approver_role = 'maintenance_incharge',
        bay_manager_approved_by = $3, bay_manager_approved_at = NOW()
        WHERE id = $1 RETURNING *`;
    } else if (status === 'PENDING_MAINTENANCE') {
      nextStatus = 'PENDING_SAFETY';
      query = `UPDATE "LOTO Work Permit" SET 
        status = $2, current_approver_role = 'safety_incharge',
        maintenance_incharge_approved_by = $3, maintenance_incharge_approved_at = NOW()
        WHERE id = $1 RETURNING *`;
    } else if (status === 'PENDING_SAFETY') {
      nextStatus = 'APPROVED';
      query = `UPDATE "LOTO Work Permit" SET 
        status = $2, current_approver_role = NULL,
        safety_incharge_approved_by = $3, safety_incharge_approved_at = NOW()
        WHERE id = $1 RETURNING *`;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid state' });
    }

    const upd = await client.query(query, [id, nextStatus, userName]);
    await client.query('COMMIT');
    res.json({ message: 'Approved', record: upd.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('LOTO approve error:', e);
    res.status(500).json({ error: 'Approval failed' });
  } finally {
    client.release();
  }
});

// Reject step
router.post('/api/loto-work-permit/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const { userName, role } = getUserFromAuth(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user', $1, true)", [userName]);
    await ensureWorkflowColumns(client);

    const { rows } = await client.query('SELECT status, current_approver_role FROM "LOTO Work Permit" WHERE id = $1 FOR UPDATE', [id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    const { status, current_approver_role } = rows[0];
    if (status === 'APPROVED' || status === 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already finalized' });
    }
    const expectedRole = current_approver_role || (status === 'PENDING_BAY' ? 'bay_manager' : status === 'PENDING_MAINTENANCE' ? 'maintenance_incharge' : 'safety_incharge');
    if (role !== expectedRole && role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not permitted for this step' });
    }

    const upd = await client.query(
      `UPDATE "LOTO Work Permit" SET status = 'REJECTED', current_approver_role = NULL,
        rejected_by = $2, rejected_at = NOW(), rejection_reason = $3
       WHERE id = $1 RETURNING *`,
      [id, userName, reason || null]
    );
    await client.query('COMMIT');
    res.json({ message: 'Rejected', record: upd.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('LOTO reject error:', e);
    res.status(500).json({ error: 'Reject failed' });
  } finally {
    client.release();
  }
});

// Edit existing LOTO record (allowed: admin, bay_manager, maintenance_incharge, safety_incharge)
router.put('/api/loto-work-permit/:id', async (req, res) => {
  const { id } = req.params;
  const { userName, role } = getUserFromAuth(req);
  const allowedRoles = ['admin', 'bay_manager', 'maintenance_incharge', 'safety_incharge'];
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Not permitted to edit LOTO permit' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user', $1, true)", [userName]);
    await ensureWorkflowColumns(client);

    const { rows } = await client.query('SELECT status FROM "LOTO Work Permit" WHERE id = $1 FOR UPDATE', [id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const { status } = rows[0];
    if (status === 'APPROVED' || status === 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot edit finalized permit' });
    }

    const fields = [
      'bd_slip_no','permit_date','permit_issuing_time','permit_closing_time','shift','plant','department','bay_no','line_name','machine_no',
      'presence_of_bay_manager_shift1','presence_of_bay_manager_shift2','presence_of_bay_manager_shift3',
      'presence_of_maintenance_incharge_shift1','presence_of_maintenance_incharge_shift2','presence_of_maintenance_incharge_shift3',
      'no_of_persons_working_in_machine_shift1','no_of_persons_working_in_machine_shift2','no_of_persons_working_in_machine_shift3',
      'emergency_switch_operator_panel_off_condition_shift1','emergency_switch_operator_panel_off_condition_shift2','emergency_switch_operator_panel_off_condition_shift3',
      'emergency_switch_cycle_start_panel_off_condition_shift1','emergency_switch_cycle_start_panel_off_condition_shift2','emergency_switch_cycle_start_panel_off_condition_shift3',
      'emergency_switch_conveyor_panel_off_condition_shift1','emergency_switch_conveyor_panel_off_condition_shift2','emergency_switch_conveyor_panel_off_condition_shift3',
      'mcb_off_lock_condition_shift1','mcb_off_lock_condition_shift2','mcb_off_lock_condition_shift3',
      'air_line_close_condition_shift1','air_line_close_condition_shift2','air_line_close_condition_shift3',
      'men_at_work_board_mcb_panel_shift1','men_at_work_board_mcb_panel_shift2','men_at_work_board_mcb_panel_shift3',
      'men_at_work_do_not_operate_machine_board_operator_panel_shift1','men_at_work_do_not_operate_machine_board_operator_panel_shift2','men_at_work_do_not_operate_machine_board_operator_panel_shift3',
      'men_at_work_board_air_valve_shift1','men_at_work_board_air_valve_shift2','men_at_work_board_air_valve_shift3'
    ];

    // Build dynamic SQL to update only provided fields
    const updates = [];
    const values = [id];
    let idx = 2;
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        updates.push(`"${f}" = $${idx++}`);
        values.push(req.body[f]);
      }
    }
    if (!updates.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sql = `UPDATE "LOTO Work Permit" SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const upd = await client.query(sql, values);
    await client.query('COMMIT');
    res.json({ message: 'Updated', record: upd.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('LOTO edit error:', e);
    res.status(500).json({ error: 'Update failed' });
  } finally {
    client.release();
  }
});

module.exports = router;