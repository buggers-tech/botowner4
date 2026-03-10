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
const pairingInProgress = new Map(); // Track pairing status

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= SOCKET CORE ================= */

async function startSocket(sessionPath, sessionKey, isPairingMode = false) {

    try {

        /* ===== Check if pairing is in progress ===== */
        if (pairingInProgress.has(sessionKey)) {
            console.log(`⏸️ Pairing in progress for ${sessionKey} - suppressing auto-reconnect`);
            return sessionSockets.get(sessionKey) || null;
        }

        /* ===== Prevent Duplicate Socket Flood ===== */

        if (sessionSockets.has(sessionKey)) {
            const oldSock = sessionSockets.get(sessionKey);

            if (oldSock?.ws?.socket && oldSock.ws.socket.readyState === 1) {
                return oldSock; // Socket still alive
            }

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);
        }

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({

            version,
            logger: pino({ level: "silent" }),

            printQRInTerminal: false,
            
            // ⭐ PRODUCTION SETTINGS FOR RENDER 24/7 ⭐
            keepAliveIntervalMs: 60000,
            receiveMessagesInChunks: true,
            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false,

            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state?.creds || {},
                keys: makeCacheableSignalKeyStore(state.keys || {})
            },

            browser: ["Ubuntu", "Chrome", "120.0.0"],

            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 3,
            retryRequestDelayMs: 500,

            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000
        });

        /* ===== CREDS AUTO SAVE ===== */

        sock.ev.on("creds.update", saveCreds);

        /* ===== CONNECTION WATCHDOG ===== */

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect } = update;
            const reason = lastDisconnect?.error?.output?.statusCode;

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: "connected",
                    connectionTime: new Date().toISOString(),
                    reconnectAttempts: 0
                });

                // Remove pairing flag when connected
                if (isPairingMode) {
                    pairingInProgress.delete(sessionKey);
                }
            }

            if (connection === "close") {

                console.log(`⚠️ ${sessionKey} connection closed - Reason: ${reason}`);

                // ⭐ HANDLE DIFFERENT DISCONNECT REASONS ⭐

                // Reason 515 = Replaced (new device connected) - Don't reconnect during pairing
                if (reason === 515) {
                    if (pairingInProgress.has(sessionKey)) {
                        console.log(`⏸️ Pairing in progress for ${sessionKey} - suppressing auto-reconnect`);
                        return; // Don't reconnect
                    }
                    // After pairing completes, reconnect
                    setTimeout(() => {
                        if (!sessionSockets.has(sessionKey) || !isSocketConnected(sessionKey)) {
                            console.log(`🔧 Reconnecting ${sessionKey} after replacement...`);
                            startSocket(sessionPath, sessionKey, false);
                        }
                    }, 5000);
                    return;
                }

                // Connection Lost/Closed - Reconnect
                if (reason === DisconnectReason.connectionClosed || 
                    reason === DisconnectReason.connectionLost ||
                    reason === DisconnectReason.connectionReplaced) {

                    const health = socketHealthMap.get(sessionKey) || {};
                    health.reconnectAttempts = (health.reconnectAttempts || 0) + 1;

                    if (health.reconnectAttempts <= 3) {
                        const delayMs = 5000 + (health.reconnectAttempts * 2000);
                        
                        console.log(`🔄 Reconnection attempt ${health.reconnectAttempts}/3 for ${sessionKey} in ${delayMs}ms`);
                        socketHealthMap.set(sessionKey, health);

                        setTimeout(() => {
                            if (!pairingInProgress.has(sessionKey)) {
                                const currentSock = sessionSockets.get(sessionKey);
                                if (!currentSock?.ws?.socket || currentSock.ws.socket.readyState !== 1) {
                                    startSocket(sessionPath, sessionKey, false);
                                }
                            }
                        }, delayMs);
                    }
                    return;
                }

                // Logout (401/403) - Require new pair
                if (reason === 401 || reason === 403 || reason === DisconnectReason.loggedOut) {
                    console.log(`🚫 Session logged out ${sessionKey} (reason: ${reason})`);
                    sessionSockets.delete(sessionKey);
                    socketHealthMap.delete(sessionKey);
                    pairingInProgress.delete(sessionKey);

                    try {
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                            console.log(`🗑️ Deleted session folder for ${sessionKey}`);
                        }
                    } catch (err) {
                        console.log(`⚠️ Could not delete session: ${err.message}`);
                    }
                    return;
                }

                // Unknown error - Don't reconnect aggressively
                console.log(`⚠️ Unknown disconnect reason ${reason} for ${sessionKey}`);
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
                fs.writeFileSync(trackFile, JSON.stringify(users, null, 2));
            } catch (err) {
                console.log("Track save error:", err.message);
            }
        }

        /* ===== BRANDING MESSAGE ===== */

        const image = "https://files.catbox.moe/ip70j9.jpg";

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

        try {
            const jid = sessionKey + "@s.whatsapp.net";
            if (sock?.user) {
                await sock.sendMessage(jid, {
                    image: { url: image },
                    caption: caption
                });
            }
        } catch {
            await sock.sendMessage(
                sessionKey + "@s.whatsapp.net",
                { text: caption }
            ).catch(() => {});
        }

        sessionSockets.set(sessionKey, sock);
        return sock;

    } catch (error) {
        console.log("❌ Socket start error:", error.message);
        return null;
    }
}

/* ================= SOCKET STATUS CHECK ================= */

function isSocketConnected(sessionKey) {
    try {
        const sock = sessionSockets.get(sessionKey);
        return sock && sock.ws && sock.ws.socket && sock.ws.socket.readyState === 1;
    } catch {
        return false;
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

        // ⭐ ONLY delete session if NOT already paired
        const credPath = path.join(sessionPath, "creds.json");
        const isAlreadyPaired = fs.existsSync(credPath);

        if (!isAlreadyPaired && fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        // Mark pairing in progress
        pairingInProgress.set(number, true);
        console.log(`🔐 Starting pairing process for ${number}...`);

        const sock = await startSocket(sessionPath, number, true);

        if (!sock)
            return res.json({
                code: "Service Temporarily Unavailable",
                error: true
            });

        /* Wait socket ready */

        let waitTime = 0;
        await new Promise(resolve => {
            const check = setInterval(() => {

                waitTime += 100;

                if (sock?.ws?.readyState === 1) {
                    clearInterval(check);
                    resolve();
                }

                // Timeout after 30 seconds
                if (waitTime > 30000) {
                    clearInterval(check);
                    resolve();
                }

            }, 100);
        });

        console.log(`✅ Socket ready for ${number} after ${waitTime/1000}s`);

        console.log(`📱 Requesting pairing code for ${number}...`);
        const code = await sock.requestPairingCode(number);

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        console.log(`✅ Pairing code generated for ${number}: ${formattedCode}`);

        return res.json({
            code: formattedCode,
            number,
            timestamp: new Date().toISOString(),
            error: false,
            message: "Please scan this code in WhatsApp. Connection will establish after authentication."
        });

    } catch (err) {

        console.log("Pairing error:", err.message);

        // Remove pairing flag on error
        let number = req.query.number?.replace(/[^0-9]/g, '');
        if (number) pairingInProgress.delete(number);

        return res.json({
            code: "Service Temporarily Unavailable",
            error: true,
            message: err.message
        });
    }
});

// ⭐ GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received - Closing all sockets gracefully...');
    sessionSockets.forEach((sock, key) => {
        try {
            sock.end();
            console.log(`✅ Socket ${key} closed`);
        } catch (err) {
            console.log(`⚠️ Error closing ${key}: ${err.message}`);
        }
    });
    setTimeout(() => process.exit(0), 2000);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received - Closing all sockets gracefully...');
    sessionSockets.forEach((sock, key) => {
        try {
            sock.end();
            console.log(`✅ Socket ${key} closed`);
        } catch (err) {
            console.log(`⚠️ Error closing ${key}: ${err.message}`);
        }
    });
    setTimeout(() => process.exit(0), 2000);
});

module.exports = router;
