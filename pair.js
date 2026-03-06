require('./settings');
require('./sessionCleaner');
const { handleMessages } = require('./main');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const reconnectAttempts = {};
const pino = require("pino");
const sessionSockets = new Map();

process.on("uncaughtException", console.log);
process.on("unhandledRejection", console.log);

const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
makeCacheableSignalKeyStore,
DisconnectReason
} = require("@whiskeysockets/baileys");

/*
====================================================
CONFIG
====================================================
*/

const SESSION_ROOT = "./session";

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
    keepAliveIntervalMs: 15000,
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys)
    },
    browser: ["Ubuntu", "Chrome", "120.0.0"]
});
    sock.ev.removeAllListeners("messages.upsert");
sock.ev.removeAllListeners("connection.update");
sock.ev.removeAllListeners("creds.update");

/* WATCHDOG KEEP ALIVE */

if (!sock.heartbeat) {
    sock.heartbeat = setInterval(async () => {
        try {
            if (!sock?.ws?.socket) return;
            if (sock.ws.socket.readyState !== 1) return;
            await sock.sendPresenceUpdate("available");
        } catch {}
    }, 25000);
}

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
        if (!chatUpdate?.messages) return;
        await handleMessages(sock, chatUpdate, true);
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

        /*
        ============================
        CONNECTION OPEN
        ============================
        */

        if (connection === "open") {

            await new Promise(r => setTimeout(r, 2500));

            if (!state?.creds?.me?.id) return;

            const cleanNumber =
                state.creds.me.id.split(":")[0];

            /* TRACK PAIRED USER */

            const trackFile = "./data/paired_users.json";
            let users = [];

            try {
                users = JSON.parse(
                    fs.readFileSync(trackFile, "utf8")
                );
            } catch {
                users = [];
            }

            if (!users.some(u => u.number === cleanNumber)) {
                users.push({ number: cleanNumber });
                fs.writeFileSync(
                    trackFile,
                    JSON.stringify(users, null, 2)
                );
            }

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

        /*
        ============================
        AUTO RECONNECT
        ============================
        */

        if (connection === "close") {

            const status =
                lastDisconnect?.error?.output?.statusCode;

            console.log("⚠ Connection closed:", sessionKey);

            if (sock.heartbeat) {
                clearInterval(sock.heartbeat);
                sock.heartbeat = null;
            }
            try {
    if (sock?.ws) {
        sock.ws.close();
    }
} catch {}

            sessionSockets.delete(sessionKey);

            if (status !== DisconnectReason.loggedOut) {

    if (!reconnectAttempts[sessionKey]) {
        reconnectAttempts[sessionKey] = 0;
    }

    reconnectAttempts[sessionKey]++;

    if (reconnectAttempts[sessionKey] > 10) {
        console.log("❌ Too many reconnect attempts:", sessionKey);
        return;
    }

    console.log("🔄 Reconnecting:", sessionKey);

    setTimeout(async () => {
        await startSocket(sessionPath, sessionKey);
    }, 5000);
    } else {

                console.log("❌ Logged out:", sessionKey);

                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                }
            }
        }

    } catch (err) {
        console.log("Connection update error:", err);
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

    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    fs.mkdirSync(sessionPath, { recursive: true });

    sessionSockets.delete(number);

    const sock = await startSocket(sessionPath, number);

    await new Promise(r => setTimeout(r, 2000));

    const code =
        await sock.requestPairingCode(number);

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

/*
====================================================
AUTO RESTORE SAVED SESSIONS
====================================================
*/

setTimeout(async () => {
    try {

        const folders = fs.readdirSync(SESSION_ROOT);

        for (const number of folders) {

            const sessionPath = path.join(SESSION_ROOT, number);

            if (fs.lstatSync(sessionPath).isDirectory()) {

                console.log("🔄 Restoring session:", number);

                await startSocket(sessionPath, number);
            }
        }

    } catch (err) {
        console.log("Session restore error:", err);
    }
}, 5000);
