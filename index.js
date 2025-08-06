// app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const code = require('./pair'); // pair.js should export an express.Router()

require('events').EventEmitter.defaultMaxListeners = 500;

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/code', code);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

// ❌ app.listen() not here if you're exporting this for Vercel or serverless
// ✅ Export the app
module.exports = app;
