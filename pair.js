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
MESSAGE HANDLER
*/
sock.ev.on("messages.upsert", async (chatUpdate) => {

try {

if (!chatUpdate?.messages?.length) return;
if (chatUpdate.type !== "notify") return;

await handleMessages(sock, chatUpdate, true);

} catch (err) {

console.log("Runtime handler error:", err);

}

});

/*
SAVE CREDS
*/
sock.ev.on("creds.update", saveCreds);

/*
CONNECTION HANDLER
*/
sock.ev.on("connection.update", async (update) => {

const { connection, lastDisconnect } = update;

try {

if (connection === "open") {

await new Promise(r => setTimeout(r, 2500));

if (!state?.creds?.me?.id) return;

const cleanNumber = state.creds.me.id.split(":")[0];
const userJid = cleanNumber + "@s.whatsapp.net";

const giftVideo = "https://files.catbox.moe/rxvkde.mp4";

const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

🚀 BOT IS NOW READY TO USE

💡 Type .menu to view commands
`;

await sock.sendMessage(userJid, {

video: { url: giftVideo },
caption: caption,

contextInfo: {
forwardingScore: 999,
isForwarded: true,
forwardedNewsletterMessageInfo: {
newsletterJid: "120363416402842348@newsletter",
newsletterName: "BUGFIXED SULEXH TECH",
serverMessageId: 1
}
}

});

console.log("✅ Startup message sent");

}

/*
AUTO RECONNECT
*/
if (connection === "close") {

const status = lastDisconnect?.error?.output?.statusCode;

console.log("⚠ Connection closed");

if (status !== DisconnectReason.loggedOut) {

setTimeout(() => {
startSocket(sessionPath, sessionKey);
}, 4000);

} else {

console.log("❌ Logged out");

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
