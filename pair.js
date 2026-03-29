require('./settings');
const { handleMessages } = require('./main');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pino = require("pino");
const axios = require("axios");

const sessionSockets = new Map();

const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
makeCacheableSignalKeyStore,
DisconnectReason
} = require("@whiskeysockets/baileys");

/*
CRASH PROTECTION
*/
process.on("uncaughtException", err => {
console.log("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
console.log("❌ Unhandled Rejection:", err);
});

/*
ANTI SLEEP
*/
const APP_URL = process.env.APP_URL || "https://bugbot-i3yc.onrender.com";

setInterval(async () => {
try {
await axios.get(APP_URL);
console.log("🔄 Self ping sent");
} catch {
console.log("Ping failed");
}
}, 4 * 60 * 1000);

/*
CONFIG
*/
const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT)) {
fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/*
SOCKET STARTER
*/
async function startSocket(sessionPath, sessionKey) {

const { version } = await fetchLatestBaileysVersion();
const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

const sock = makeWASocket({
version,
logger: pino({ level: "silent" }),
printQRInTerminal: false,
keepAliveIntervalMs: 5000,

auth: {
creds: state.creds,
keys: makeCacheableSignalKeyStore(state.keys)
},

browser: ["Ubuntu", "Chrome", "20.0.04"]

});

if (sessionKey) {
sessionSockets.set(sessionKey, sock);
}

/*
CONNECTION HANDLER
*/
sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    try {
        if (connection === "open" && state?.creds?.me?.id) {
            const cleanNumber = state.creds.me.id.split(":")[0];
            const userJid = `${cleanNumber}@s.whatsapp.net`;

            // Auto-playing gift
            const giftGif = "https://files.catbox.moe/rxvkde.mp4";

            // Caption with group and owner
            const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟
🚀 BOT IS NOW READY TO USE

💡 Type .menu to view commands

📢 Join WhatsApp Group:
https://chat.whatsapp.com/DG9XlePCVTEJclSejnZwN5?mode=gi_t

📞 Contact BUGBOT Owner: +254768161116
`;

            await sock.sendMessage(userJid, {
                video: { url: giftGif },
                caption,
                gifPlayback: true,
                contextInfo: { forwardingScore: 999, isForwarded: true }
            });
            console.log("✅ Startup gift sent");

            // Save session only after successful connection
            saveCreds();
            console.log(`💾 Session saved for ${cleanNumber}`);
        }

        /* AUTO RECONNECT */
        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            console.log("⚠ Connection closed");

            if (status !== DisconnectReason.loggedOut) {
                setTimeout(() => startSocket(sessionPath, sessionKey), 4000);
            } else {
                console.log("❌ Logged out: session cleared");
                sessionSockets.delete(sessionKey);
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        }

    } catch (err) {
        console.log("Connection handler error:", err);
    }
});

return sock;

}

/*
PAIR PAGE
*/
router.get('/', (req, res) => {
res.sendFile(process.cwd() + "/pair.html");
});

/*
BOT STATUS
*/
router.get('/alive', (req, res) => {
res.send("Bot Alive");
});

/*
PAIR CODE API
*/
router.get('/code', async (req, res) => {

try {

let number = req.query.number;

if (!number)
return res.json({ code: "Number Required" });

number = number.replace(/[^0-9]/g, '');

const sessionPath = path.join(SESSION_ROOT, number);

if (!fs.existsSync(sessionPath)) {
fs.mkdirSync(sessionPath, { recursive: true });
}

let sock = sessionSockets.get(number);

if (!sock) {
sock = await startSocket(sessionPath, number);
}

await new Promise(r => setTimeout(r, 2000));

let code = await sock.requestPairingCode(number);

return res.json({
code: code?.match(/.{1,4}/g)?.join("-") || code
});

} catch (err) {

console.log("Pairing Error:", err);

return res.json({
code: "Service Unavailable"
});

}

});

module.exports = router;
