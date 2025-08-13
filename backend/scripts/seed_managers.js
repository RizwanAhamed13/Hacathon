// Seed default manager and admin accounts
const pool = require('../auth/userModel');

(async () => {
  try {
    const users = [
      { username: 'bay_manager', password: '12345', role: 'bay_manager' },
      { username: 'maintenance_incharge', password: '12345', role: 'maintenance_incharge' },
      { username: 'safety_incharge', password: '12345', role: 'safety_incharge' },
      { username: 'admin', password: '12345', role: 'admin' },
    ];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (username, password, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role`,
        [u.username, u.password, u.role]
      );
    }

    console.log('Seed complete: default manager/admin users are ready.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
})();
