/**
 * Database Configuration
 * 
 * PostgreSQL connection configuration
 * Customize these values according to your PostgreSQL setup
 */

const { Pool } = require('pg');

// Database configuration object
const dbConfig = {
    user: process.env.DB_USER || 'ynw',
    password: process.env.DB_PASSWORD || '51NJAZG3eWbf7o1sTh45sqzdbIYpGuvF',
    host: process.env.DB_HOST || 'dpg-d5l5lq24d50c73dvng9g-a',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'todo_db_2026'
};

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Handle pool connection errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Log successful connection
pool.on('connect', () => {
    console.log('✓ Connected to PostgreSQL database');
});

/**
 * Execute a query
 * @param {string} query - SQL query string
 * @param {Array} values - Query parameters
 * @returns {Promise} Query result
 */
async function query(queryText, values = []) {
    const start = Date.now();
    try {
        const result = await pool.query(queryText, values);
        const duration = Date.now() - start;
        console.log('Executed query', { queryText, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Get a single client from the pool for transactions
 * @returns {Promise} Database client
 */
async function getClient() {
    return await pool.connect();
}

/**
 * Close the database connection pool
 */
async function closePool() {
    await pool.end();
}

module.exports = {
    query,
    getClient,
    closePool,
    pool
};
