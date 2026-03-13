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
====================================================
CRASH PROTECTION
====================================================
*/

process.on("uncaughtException", err => {
console.log("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
console.log("❌ Unhandled Rejection:", err);
});

/*
====================================================
ANTI SLEEP (RENDER KEEP ALIVE)
====================================================
*/

const APP_URL = process.env.APP_URL || "https://bugbot-i3yc.onrender.com";

setInterval(async () => {
try {
await axios.get(APP_URL);
console.log("🔄 Self ping sent (anti sleep)");
} catch {
console.log("Ping failed");
}
}, 4 * 60 * 1000);

/*
====================================================
RAM AUTO CLEANER
====================================================
*/

setInterval(() => {

const used = process.memoryUsage();

const mb = used.heapUsed / 1024 / 1024;

console.log("🧠 RAM Usage:", mb.toFixed(2), "MB");

if (mb > 350) {

console.log("♻ Cleaning memory");

global.gc && global.gc();

}

}, 60 * 1000);

/*
====================================================
CLEAN DEAD SOCKETS
====================================================
*/

setInterval(() => {

for (const [key, sock] of sessionSockets) {

if (!sock?.user) {

sessionSockets.delete(key);

console.log("🧹 Removed dead socket:", key);

}

}

}, 5 * 60 * 1000);

/*
====================================================
CONFIG
====================================================
*/

const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT)) {
fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/*
====================================================
SOCKET STARTER
====================================================
*/

async function startSocket(sessionPath, sessionKey) {

const { version } = await fetchLatestBaileysVersion();

const { state, saveCreds } =
await useMultiFileAuthState(sessionPath);

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
====================================================
Runtime Message Handler
====================================================
*/

sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
        if (!chatUpdate?.messages?.length) return;
        if (chatUpdate.type !== "notify") return;

        await handleMessages(sock, chatUpdate, true);

        // === send forwarded channel promo to the sender ===
        const jid = chatUpdate.messages[0].key.remoteJid;
        await sendChannelPromo(sock, jid);

    } catch (err) {
        console.log("Runtime handler error:", err);
    }
});

/*
====================================================
Creds Save
====================================================
*/

sock.ev.on("creds.update", saveCreds);

/*
====================================================
Connection Handler
====================================================
*/

sock.ev.on("connection.update", async (update) => {

const { connection, lastDisconnect } = update;

try {

if (connection === "open") {

await new Promise(r => setTimeout(r, 2500));

if (!state?.creds?.me?.id) return;

const cleanNumber =
state.creds.me.id.split(":")[0];

const userJid =
cleanNumber + "@s.whatsapp.net";

const giftVideo =
"https://files.catbox.moe/rxvkde.mp4";

const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Multi Device Connected ✔
┃ BUGBOT ENGINE ACTIVE ✔
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 *BOT IS NOW READY TO USE*

┏━━━ 🌍 HELP & SUPPORT ━━━┓
┃ 👑 Owner Help Center
┃ ➤ https://wa.me/message/O6KFV26U3MMGP1
┃
┃ 📢 Join Official Group
┃ ➤ https://chat.whatsapp.com/GyZBMUtrw9LIlV6htLvkCK
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

💡 Type *.menu* to view commands

✨ *BUGFIXED SULEXH TECH ADVANCED BOT*✨
`;

await sock.sendMessage(userJid, {
video: { url: giftVideo },
caption: caption
});

console.log("✅ Branding startup message sent");

}
  await sock.sendMessage(userJid, {
    text: "📢 Follow our official WhatsApp Channel for updates!",
    contextInfo: {
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363416402842348@newsletter",
            newsletterName: "BUGFIXED SULEXH TECH",
            serverMessageId: 1 // can be any number
        }
    }
});

console.log("📢 Forwarded newsletter sent");

/*
============================
AUTO RECONNECT
============================
*/

if (connection === "close") {

const status =
lastDisconnect?.error?.output?.statusCode;

console.log("⚠ Connection closed. Auto reconnecting...");

if (status !== DisconnectReason.loggedOut) {

setTimeout(() => {
startSocket(sessionPath, sessionKey);
}, 4000);

} else {

console.log("❌ Logged out from WhatsApp.");

}

}

} catch (err) {

console.log("Connection handler error:", err);

}

});

return sock;

}

/*
====================================================
PAIR PAGE
====================================================
*/

router.get('/', (req, res) => {

res.sendFile(process.cwd() + "/pair.html");

});

/*
====================================================
BOT STATUS ROUTE
====================================================
*/

router.get('/alive', (req,res)=>{

res.send("Bot Alive");

});

/*
====================================================
PAIR CODE API
====================================================
*/

router.get('/code', async (req, res) => {

try {

let number = req.query.number;

if (!number)
return res.json({ code: "Number Required" });

number = number.replace(/[^0-9]/g, '');

const sessionPath =
path.join(SESSION_ROOT, number);

if (!fs.existsSync(sessionPath)) {
fs.mkdirSync(sessionPath, { recursive: true });
}

/*
CHECK EXISTING SOCKET
*/

let sock = sessionSockets.get(number);

if (!sock) {

sock = await startSocket(sessionPath, number);

} else {

try {

if (!sock?.user) {

sessionSockets.delete(number);

sock = await startSocket(sessionPath, number);

}

} catch {

sessionSockets.delete(number);

sock = await startSocket(sessionPath, number);

}

}

await new Promise(r => setTimeout(r, 2000));

/*
REQUEST PAIR CODE
*/

let code;

try {

code = await sock.requestPairingCode(number);

} catch (err) {

console.log("Pair retry:", err);

sessionSockets.delete(number);

sock = await startSocket(sessionPath, number);

await new Promise(r => setTimeout(r, 2000));

code = await sock.requestPairingCode(number);

}

/*
TRACK USERS
*/

const trackFile = "./data/paired_users.json";

let users = [];

try {

users = JSON.parse(
fs.readFileSync(trackFile, "utf8")
);

} catch {

users = [];

}

if (!users.some(u => u.number === number)) {

users.push({ number });

}

fs.writeFileSync(
trackFile,
JSON.stringify(users, null, 2)
);

/*
RETURN CODE
*/

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

/*
====================================================
RESTORE PAIRED SESSIONS
====================================================
*/

async function restoreSessions() {

const trackFile = "./data/paired_users.json";

if (!fs.existsSync(trackFile)) return;

let users = [];

try {

users = JSON.parse(fs.readFileSync(trackFile));

} catch {

users = [];

}

for (const user of users) {

const number = user.number;

const sessionPath =
path.join(SESSION_ROOT, number);

if (fs.existsSync(sessionPath)) {

console.log("♻ Restoring session:", number);

startSocket(sessionPath, number);

}

}

}

setTimeout(() => {

restoreSessions();

}, 5000);

module.exports = router;
