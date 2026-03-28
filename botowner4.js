const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const axios = require('axios');
const app = express();
const __path = process.cwd();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__path, 'public')));

// Homepage
app.get('/', (req, res) => res.sendFile(path.join(__path, 'botowner4page.html')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: "OK", message: "BUGFIXED XMD Bot is alive ✅", timestamp: new Date().toISOString() });
});

app.get('/alive', (req, res) => res.send("Bot Alive"));

// Mount routers
const pairRouter = require('./pair'); // your pair.js with improvements
app.use('/pair', pairRouter);

// Self-ping to prevent sleeping
setInterval(async () => {
    try {
        const res = await axios.get(`http://localhost:${PORT}/health`);
        console.log('✅ Self-ping successful:', res.data.status);
    } catch (err) {
        console.log('❌ Self-ping failed:', err.message);
    }
}, 4 * 60 * 1000); // every 4 minutes

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log("BUGFIXED XMD Server Running ✅");
    console.log(`Homepage => http://localhost:${PORT}/`);
    console.log(`Health check => http://localhost:${PORT}/health`);
});

module.exports = app;
