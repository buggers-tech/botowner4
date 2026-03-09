require('./settings');
require('./sessionCleaner');

const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require("pino");

const router = express.Router();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    MessageRetryMap,
    DisconnectReason
} = require("@whiskeysockets/baileys");

/* ================= GLOBAL MAPS ================= */

const sessionSockets = new Map();
const socketHealthMap = new Map();
const socketReadyMap = new Map();

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= SOCKET CORE ================= */

async function startSocket(sessionPath, sessionKey) {

    try {

        /* ===== Prevent Duplicate Socket Flood ===== */

        if (sessionSockets.has(sessionKey)) {
            const oldSock = sessionSockets.get(sessionKey);

            if (oldSock?.ws?.socket) return oldSock;

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);
            socketReadyMap.delete(sessionKey);
        }

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({

            version,
            logger: pino({ level: "silent" }),

            printQRInTerminal: false,
            keepAliveIntervalMs: 10000,

            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state?.creds || {},
                keys: makeCacheableSignalKeyStore(state.keys || {})
            },

            browser: ["Ubuntu", "Chrome", "120.0.0"],

            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 1,
            retryRequestDelayMs: 100,

            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,

            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false
        });

        /* ===== CREDS AUTO SAVE ===== */

        sock.ev.on("creds.update", saveCreds);

        /* ===== MARK SOCKET AS READY FOR PAIRING ===== */

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect, qr } = update;

            // Socket is ready for pairing when WebSocket connects
            if (connection === "connecting" || connection === "open") {
                socketReadyMap.set(sessionKey, true);
                console.log(`⚡ ${sessionKey} socket ready state updated`);
            }

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: "connected"
                });

                /* ===== SEND BRANDING MESSAGE AFTER CONNECTION ===== */

                const image = "https://files.catbox.moe/ip70j9.jpg";

                const caption = `
╔════════════════════════════╗
║ 🚀 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━���━━━━━━┓
┃ ✅ Multi Device Connected
┃ ✅ V10 BUGBOT ENGINE ACTIVE
┃ ✅ Whatsapp Crasher ON
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 *BOT IS NOW READY FOR OPERATIONS*

💡 Type *.menu* to view commands
`;

                try {

                    const jid = sessionKey + "@s.whatsapp.net";

                    if (sock?.user) {
                        sock.sendMessage(jid, {
                            image: { url: image },
                            caption: caption
                        }).catch(() => {
                            sock.sendMessage(jid, { text: caption }).catch(() => {});
                        });
                    }

                } catch (e) {
                    console.log("Branding message error:", e.message);
                }
            }

            if (connection === "close") {

                console.log(`⚠️ ${sessionKey} connection closed`);

                const reason = lastDisconnect?.error?.output?.statusCode;

                if (reason !== DisconnectReason.loggedOut) {

                    /* ⭐ Stable watchdog reconnect (no spam loop) */

                    setTimeout(() => {
                        if (!sessionSockets.has(sessionKey)) {
                            startSocket(sessionPath, sessionKey);
                        }
                    }, 8000);

                } else {
                    console.log(`🚫 Session logged out ${sessionKey}`);
                    sessionSockets.delete(sessionKey);
                    socketReadyMap.delete(sessionKey);
                }
            }
        });

        /* ===== SESSION TRACKING ===== */

        const trackFile = "./data/paired_users.json";
        let users = [];

        try {

            if (fs.existsSync(trackFile)) {
                const raw = fs.readFileSync(trackFile, "utf8").trim();
                if (raw) users = JSON.parse(raw);
            }

        } catch {
            users = [];
        }

        if (!users.some(u => u.number === sessionKey)) {

            users.push({
                number: sessionKey,
                pairedAt: new Date().toISOString()
            });

            try {

                const dir = path.dirname(trackFile);

                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(trackFile,
                    JSON.stringify(users, null, 2));

            } catch (err) {
                console.log("Track save error:", err.message);
            }
        }

        sessionSockets.set(sessionKey, sock);

        return sock;

    } catch (error) {

        console.log("❌ Socket start error:", error.message);
        return null;
    }
}

/* ================= PAIR API ================= */

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

router.get('/code', async (req, res) => {

    try {

        let number = req.query.number;

        if (!number)
            return res.json({ code: "Number Required", error: true });

        number = number.replace(/[^0-9]/g, '');

        if (number.length < 10)
            return res.json({ code: "Invalid Number Format", error: true });

        const sessionPath = path.join(SESSION_ROOT, number);

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        const sock = await startSocket(sessionPath, number);

        if (!sock)
            return res.json({
                code: "Service Temporarily Unavailable",
                error: true
            });

        /* ===== Wait for WebSocket to be ready (NOT full login) ===== */

        console.log(`⏳ Waiting for WebSocket readiness on ${number}...`);

        await new Promise((resolve, reject) => {
            
            const timeout = setTimeout(() => {
                console.log(`❌ WebSocket timeout for ${number}`);
                reject(new Error("WebSocket connection timeout"));
            }, 15000); // Reduced from 30s to 15s for WebSocket only

            const checkReady = setInterval(() => {
                // Check if WebSocket is open and ready
                if (sock?.ws?.isOpen || socketReadyMap.get(number)) {
                    clearInterval(checkReady);
                    clearTimeout(timeout);
                    console.log(`✅ WebSocket connected for ${number}`);
                    resolve();
                }
            }, 200);
        });

        // Small delay for Baileys internal initialization
        await new Promise(resolve => setTimeout(resolve, 500));

        /* ===== Request pairing code ===== */

        console.log(`📱 Requesting pairing code for ${number}...`);

        const code = await sock.requestPairingCode(number);

        if (!code) {
            throw new Error("Failed to generate pairing code");
        }

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        console.log(`✅ Pairing code generated for ${number}: ${formattedCode}`);

        return res.json({
            code: formattedCode,
            number,
            timestamp: new Date().toISOString(),
            error: false
        });

    } catch (err) {

        console.log("❌ Pairing error:", err.message);

        return res.json({
            code: "Error: " + err.message,
            error: true,
            message: err.message
        });
    }
});

module.exports = router;
