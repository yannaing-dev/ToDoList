/**
 * To-Do List Application - Node.js Server with PostgreSQL
 * 
 * Express.js server with PostgreSQL database integration for persistent task storage.
 * Serves static HTML/CSS/JS and provides REST API endpoints for task management.
 */

const express = require('express');
const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 4000;

// Import routes
const taskRoutes = require('./routes/taskRoutes');

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// API ROUTES
// ============================================================================

// Task management API routes
app.use('/api', taskRoutes);

// ============================================================================
// STATIC ROUTES
// ============================================================================

// Serve the main HTML file for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║  🚀 To-Do List Server is Running!          ║
  ╠════════════════════════════════════════════╣
  ║  Local:   http://localhost:${PORT}            ║
  ║  API:     http://localhost:${PORT}/api       ║
  ║  Database: PostgreSQL                      ║
  ║  Press Ctrl+C to stop                      ║
  ╚════════════════════════════════════════════╝
  `);
});
