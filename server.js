/**
 * To-Do List Application - Node.js Server
 * 
 * A simple Express.js server that serves a static HTML/CSS/JS To-Do application.
 * Data persistence is handled client-side using localStorage.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║     🚀 To-Do List Server is Running!       ║
  ╠════════════════════════════════════════════╣
  ║  Local:   http://localhost:${PORT}            ║
  ║  Press Ctrl+C to stop                      ║
  ╚════════════════════════════════════════════╝
  `);
});
