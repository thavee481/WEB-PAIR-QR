// api/index.js

const express = require('express');
const path = require('path');
const app = express();

// Static files serve from public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve HTML file on root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pair.html'));
});

module.exports = app;
