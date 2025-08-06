const express = require('express');
const app = express();
__path = process.cwd()
const bodyParser = require("body-parser");
let code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use('/code', code);

app.use('/', async (req, res) => {
    const path = require('path');
res.sendFile(path.join(__dirname, 'pair.html'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ❌ app.listen() ඉවත් කරනවා
// ✅ app එක export කරනවා
module.exports = app;
