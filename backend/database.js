const { Pool } = require('pg');
//require('dotenv').config({ path: '../.env' });
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

// ✅ DEBUG LINE - REMOVE AFTER TESTING
console.log('Loaded DB_USER:', process.env.DB_USER);
console.log('Loaded DB_PASS:', process.env.DB_PASS ? '(HIDDEN)' : '❌ NOT LOADED');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});
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
