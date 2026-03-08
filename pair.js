require('./settings');
require('./sessionCleaner');

const { handleMessages } = require('./main');

const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();
const pino = require("pino");

// Enhanced socket management with better error handling
const sessionSockets = new Map();
const socketHealthMap = new Map();

// Improved error handling for production stability
process.on("uncaughtException", (error) => {
    console.log("Uncaught Exception:", error.message);
    // Do not exit process to maintain bot stability
});
process.on("unhandledRejection", (reason, promise) => {
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
});

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    MessageRetryMap
} = require("@whiskeysockets/baileys");

/* CONFIG FOR STABILITY */

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ENHANCED SOCKET STARTER WITH ANTI-CRASH MECHANISMS */
async function startSocket(sessionPath, sessionKey) {

    if (sessionSockets.has(sessionKey)) {
        const existingSock = sessionSockets.get(sessionKey);

        if (existingSock && existingSock.ws && existingSock.ws.socket) {
            return existingSock;
        } else {
            // Clean up dead socket
            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);
        }
    }

    try {
        const { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        // Enhanced socket configuration for stability and message flooding
        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }), // Suppress logs for better performance
            printQRInTerminal: false,
            keepAliveIntervalMs: 10000,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys)
            },
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 1,
            retryRequestDelayMs: 100,
            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false,
            options: {
                chunkSize: 1024 * 1024,
                maxChunkSize: 1024 * 1024 * 5
            }
        });

        const cleanNumber = sessionKey;

        const userJid = cleanNumber + "@s.whatsapp.net";

        const cleanNumber = state.creds.me.id.split(":")[0];

        /* TRACK PAIRED USER */
        const trackFile = "./data/paired_users.json";
        let users = [];

        try {
            if (fs.existsSync(trackFile)) {
                users = JSON.parse(fs.readFileSync(trackFile, "utf8"));
            }
        } catch (error) {
            console.log("Error reading paired users file:", error.message);
            users = [];
        }

        if (!users.some(u => u.number === cleanNumber)) {
            users.push({
                number: cleanNumber,
                pairedAt: new Date().toISOString()
            });

            try {
                const dataDir = path.dirname(trackFile);
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }

                fs.writeFileSync(trackFile, JSON.stringify(users, null, 2));
            } catch (error) {
                console.log("Error saving paired users file:", error.message);
            }
        }

        const userJid = cleanNumber + "@s.whatsapp.net";
        const image = "https://files.catbox.moe/ip70j9.jpg";

        /* ENHANCED BRANDING MESSAGE */
        const caption = `
╔════════════════════════════╗
║ 🚀 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Multi Device Connected
┃ ✅ ENHANCED BUGBOT ENGINE ACTIVE
┃ ✅ Whatsapp Crasher ON
┃ ✅ Bug commands for premium users (Dangerous 😪☠️)
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 *BOT IS NOW READY FOR OPERATIONS*

💡 Type *.menu* to view commands
`;

        try {
            await sock.sendMessage(userJid, {
                image: { url: image },
                caption: caption
            });
        } catch (error) {
            await sock.sendMessage(userJid, { text: caption });
        }

        socketHealthMap.set(sessionKey, {
            lastHeartbeat: Date.now(),
            status: 'connected'
        });

        return sock;

    } catch (error) {
        console.log(`❌ Failed to start socket for ${sessionKey}:`, error.message);
        throw error;
    }
}

/* PAIR PAGE */
router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});
/* PAIR CODE API */
router.get('/code', async (req, res) => {
    try {
        let number = req.query.number;

        if (!number) {
            return res.json({ code: "Number Required", error: true });
        }

        number = number.replace(/[^0-9]/g, '');

        if (number.length < 10) {
            return res.json({ code: "Invalid Number Format", error: true });
        }

        const sessionPath = path.join(SESSION_ROOT, number);

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        const sock = await startSocket(sessionPath, number);

        await new Promise(resolve => setTimeout(resolve, 7000));

        const code = await sock.requestPairingCode(number);

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        return res.json({
            code: formattedCode,
            number,
            timestamp: new Date().toISOString(),
            error: false
        });

    } catch (err) {
        console.log("❌ Pairing Error:", err.message);

        return res.json({
            code: "Service Temporarily Unavailable",
            error: true,
            message: err.message
        });
    }
});
module.exports = router;

/* ENHANCED AUTO RESTORE SESSIONS */
setTimeout(async () => {
    try {

        if (!fs.existsSync(SESSION_ROOT)) {
            fs.mkdirSync(SESSION_ROOT, { recursive: true });
            return;
        }

        const folders = fs.readdirSync(SESSION_ROOT);

        for (let i = 0; i < folders.length; i++) {

            const number = folders[i];
            const sessionPath = path.join(SESSION_ROOT, number);

            if (fs.lstatSync(sessionPath).isDirectory()) {

                setTimeout(() => {
                    startSocket(sessionPath, number).catch(error => {
                        console.log(`❌ Failed to restore session ${number}:`, error.message);
                    });
                }, i * 2000);

            }
        }

    } catch (err) {
        console.log("❌ Session restore error:", err.message);
    }

}, 8000);
