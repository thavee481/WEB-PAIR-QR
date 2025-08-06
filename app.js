const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/code', code);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

module.exports = app;
