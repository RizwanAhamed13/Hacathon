
// User model for authentication and role management (PostgreSQL)
const { Pool } = require('pg');
const user = process.env.DB_USER || process.env.POSTGRES_USER || 'rizwan';
const password = process.env.DB_PASS || process.env.POSTGRES_PASSWORD || 'rizwan';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '5432';
const dbname = process.env.DB_NAME || process.env.POSTGRES_DB || 'sakthiauto123';
const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbname}`;
const pool = new Pool({ connectionString });

// Create users table if not exists
const createUserTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    form_access TEXT DEFAULT ''
  )`);
};

createUserTable();

module.exports = pool;
