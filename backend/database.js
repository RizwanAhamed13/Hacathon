const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

// Resolve connection settings with sensible fallbacks
const user = process.env.DB_USER || process.env.POSTGRES_USER || 'rizwan';
const password = process.env.DB_PASS || process.env.POSTGRES_PASSWORD || 'rizwan';
const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 5432;
const database = process.env.DB_NAME || process.env.POSTGRES_DB || 'sakthiauto123';

const pool = new Pool({ user, host, database, password, port });

// Test database connection for Database.js
pool.connect((err, client, done) => {
  if (err) {
    console.error('Database.js - Database connection test failed:', err.stack);
  } else {
    console.log('Database.js - Database connected successfully');
    done();
  }
});

module.exports = pool;
