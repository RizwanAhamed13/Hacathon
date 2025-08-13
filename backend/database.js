const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load .env file from project root
dotenv.config({ path: '.env' });

// Debug logs (optional: remove in production)
console.log('Loaded DB_USER:', process.env.DB_USER || '❌ NOT LOADED');
console.log('Loaded DB_PASS:', process.env.DB_PASS ? '********' : '❌ NOT LOADED');

// Create database pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false // Optional for cloud DBs
});

// Test database connection
pool.connect((err, client, done) => {
    if (err) {
        console.error('❌ Database connection failed:', err.stack);
    } else {
        console.log('✅ Database connected successfully');
        done();
    }
});
console.log(process.env);

module.exports = pool;
