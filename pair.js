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
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");

/* ================= GLOBAL MAPS ================= */

const sessionSockets = new Map();
const socketHealthMap = new Map();
const socketHeartbeatMap = new Map();
const pairingInProgress = new Map();

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= SOCKET CORE ================= */

async function startSocket(sessionPath, sessionKey, isPairing = false) {

    try {

        if (sessionSockets.has(sessionKey)) {

            const oldSock = sessionSockets.get(sessionKey);

            if (oldSock?.ws?.socket) {
                if (!isPairing) return oldSock;
            }

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);

            const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
            if (oldHeartbeat) clearInterval(oldHeartbeat);
            socketHeartbeatMap.delete(sessionKey);
        }

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({

            version,
            logger: pino({ level: "silent" }),

            printQRInTerminal: false,

            keepAliveIntervalMs: 60000,
            receiveMessagesInChunks: true,

            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },

            browser: Browsers.ubuntu('Chrome'),

            msgRetryCounterMap: new Map(),
            maxMsgRetryCount: 2,
            retryRequestDelayMs: 200,

            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,

            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: "connected",
                    messagesSentDuringSession: 0
                });

                if (!isPairing) {
                    startSocketHeartbeat(sessionKey, sock);
                }
            }

            if (connection === "close") {

                const reason = lastDisconnect?.error?.output?.statusCode;

                console.log(`⚠️ ${sessionKey} connection closed - Reason: ${reason}`);

                if (pairingInProgress.get(sessionKey) === true) {
                    console.log(`⏸️ Pairing still generating code for ${sessionKey}`);
                    return;
                }

                if (reason !== DisconnectReason.loggedOut && reason !== 401 && reason !== 403) {

                    console.log(`🔄 Attempting automatic reconnection for ${sessionKey}`);

                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);
                    socketHeartbeatMap.delete(sessionKey);

                    setTimeout(() => {
                        startSocket(sessionPath, sessionKey, false);
                    }, 8000);

                } else {

                    console.log(`🚫 Session logged out ${sessionKey}`);

                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);

                    socketHeartbeatMap.delete(sessionKey);
                    sessionSockets.delete(sessionKey);
                    socketHealthMap.delete(sessionKey);
                }
            }
        });

        /* ===== MESSAGE HANDLER ===== */

        sock.ev.on("messages.upsert", async ({ messages }) => {

            const msg = messages[0];

            if (!msg.message) return;

            console.log("📩 Message received");
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

/* ================= HEARTBEAT ================= */

function startSocketHeartbeat(sessionKey, sock) {

    const existingHeartbeat = socketHeartbeatMap.get(sessionKey);
    if (existingHeartbeat) clearInterval(existingHeartbeat);

    const heartbeat = setInterval(() => {

        try {

            if (!isSocketConnected(sessionKey)) {
                clearInterval(heartbeat);
                socketHeartbeatMap.delete(sessionKey);
                return;
            }

            if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                sock.ws.socket.ping();
            }

            const health = socketHealthMap.get(sessionKey);

            if (health) health.lastHeartbeat = Date.now();

        } catch {}

    }, 30000);

    socketHeartbeatMap.set(sessionKey, heartbeat);
}

/* ================= SOCKET STATUS ================= */

function isSocketConnected(sessionKey) {

    try {

        const sock = sessionSockets.get(sessionKey);

        return sock && sock.ws && sock.ws.socket && sock.ws.socket.readyState === 1;

    } catch {
        return false;
    }
}

/* ================= PAIR PAGE ================= */

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

/* ================= PAIR CODE ================= */

router.get('/code', async (req, res) => {

    try {

        let number = req.query.number;

        if (!number)
            return res.json({ code: "Number Required", error: true });

        number = number.replace(/[^0-9]/g, '');

        if (number.length < 10)
            return res.json({ code: "Invalid Number Format", error: true });

        if (pairingInProgress.get(number)) {
            return res.json({
                code: "Pairing already in progress for this number",
                error: true
            });
        }

        const sessionPath = path.join(SESSION_ROOT, number);

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            await new Promise(r => setTimeout(r, 1000));
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        pairingInProgress.set(number, true);

        console.log(`🔐 Starting pairing process for ${number}`);

        const sock = await startSocket(sessionPath, number, true);

        if (!sock) {

            pairingInProgress.delete(number);

            return res.json({
                code: "Service Temporarily Unavailable",
                error: true
            });
        }

        let ready = false;
        let tries = 0;

        while (!ready && tries < 60) {

            if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                ready = true;
                break;
            }

            await new Promise(r => setTimeout(r, 1000));
            tries++;
        }

        if (!ready) {

            pairingInProgress.delete(number);

            return res.json({
                code: "Socket Connection Timeout",
                error: true
            });
        }

        await new Promise(r => setTimeout(r, 1500));

        console.log(`📱 Requesting pairing code for ${number}`);

        const code = await sock.requestPairingCode(number);

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        console.log(`✅ Pairing code generated for ${number}: ${formattedCode}`);

        pairingInProgress.set(number, "waiting_for_auth");

        return res.json({
            code: formattedCode,
            number,
            timestamp: new Date().toISOString(),
            error: false
        });

    } catch (err) {

        console.log("Pairing endpoint error:", err.message);

        return res.json({
            code: "Service Error",
            error: true
        });
    }
});

/* ================= PAIR CHECK ================= */

router.get('/check/:number', async (req, res) => {

    try {

        const number = req.params.number.replace(/[^0-9]/g, '');

        const sock = sessionSockets.get(number);

        if (!sock) {
            return res.json({ status: "not_connected" });
        }

        const isConnected = sock?.ws?.socket && sock.ws.socket.readyState === 1;
        const user = sock?.user;

        if (isConnected && user) {

            pairingInProgress.delete(number);

            const caption = `
╔════════════════════════════╗
║ 🚀 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Multi Device Connected
┃ ✅ V10 BUGBOT ENGINE ACTIVE
┃ ✅ Whatsapp Crasher ON
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 *BOT IS NOW READY FOR OPERATIONS*

💡 Type *.menu* to view commands
`;

            const jid = number + "@s.whatsapp.net";

            try {
                await sock.sendMessage(jid, { text: caption });
            } catch {}

            return res.json({
                status: "connected",
                authenticated: true,
                number: number,
                user: user?.name || user?.id
            });
        }

        return res.json({
            status: "waiting"
        });

    } catch {

        return res.json({
            status: "error"
        });
    }
});

module.exports = router;
