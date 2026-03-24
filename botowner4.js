const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const __path = process.cwd();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

// Routes
const serverQR = require('./bugbotqr');
const codePair = require('./pair');
const receiveRoute = require('./receive');
require('events').EventEmitter.defaultMaxListeners = 500;

// Mount routers
app.use('/bugbotqr', serverQR);
app.use('/pair', codePair);
app.use('/receive', receiveRoute);
// Homepage
app.get('/', async (req, res) => {
    res.sendFile(__path + '/botowner4page.html');
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log("BUGFIXED XMD Server Running ✅");
    console.log("Port => " + PORT);
});

module.exports = app;
