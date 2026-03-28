const express = require('express');
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

// Routes
const serverQR = require('./bugbotqr');
const codePair = require('./pair');
const receiveRoute = require('./receive');

// Mount routers
app.use('/bugbotqr', serverQR);
app.use('/pair', codePair);
app.use('/receive', receiveRoute);


// ✅ FAST ROOT ROUTE (for uptime ping)
app.get('/', (req, res) => {
    res.status(200).send("Bot is alive 🚀");
});

// ✅ HEALTH CHECK ROUTE (use THIS in UptimeRobot)
app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok" });
});


// ✅ SELF PING (backup anti-sleep system)
setInterval(async () => {
    try {
        await axios.get(`http://localhost:${PORT}/health`);
        console.log("✅ Self ping sent");
    } catch (err) {
        console.log("❌ Self ping failed");
    }
}, 300000); // every 5 minutes


// ✅ GLOBAL ERROR HANDLING (prevents silent crashes)
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err);
});


// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 BUGFIXED XMD Server Running");
    console.log("🌍 Port => " + PORT);
});

module.exports = app;
