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
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");

/* ================= GLOBAL MAPS ================= */

const sessionSockets = new Map();
const socketHealthMap = new Map();
const socketHeartbeatMap = new Map();
const pairingInProgress = new Map(); // Track active pairing processes

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= SOCKET CORE ================= */

async function startSocket(sessionPath, sessionKey, isPairing = false) {

    try {

        /* ===== Prevent Duplicate Socket Flood ===== */

        if (sessionSockets.has(sessionKey)) {
            const oldSock = sessionSockets.get(sessionKey);

            if (oldSock?.ws?.socket) {
                // Only return if not during pairing
                if (!isPairing) return oldSock;
            }

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);
            
            // Clear old heartbeat
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
            
            // CRITICAL: Pairing settings - keep socket alive during pairing
            keepAliveIntervalMs: 60000, // More generous keep-alive
            receiveMessagesInChunks: true,
            retryRequestDelayMs: 500,

            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state?.creds || {},
                keys: makeCacheableSignalKeyStore(state.keys || {})
            },

            browser: Browsers.ubuntu('Chrome'),

            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 2,
            retryRequestDelayMs: 200,

            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,

            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false,
            
            // CRITICAL: Keep socket alive and stable
            reconnectOnNetworkChange: true,
            alwaysOnline: true,
            emitOwnEventsUnfiltered: false
        });

        /* ===== CREDS AUTO SAVE ===== */

        sock.ev.on("creds.update", saveCreds);

        /* ===== CONNECTION WATCHDOG ===== */

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect, qr } = update;

            const jid = sessionKey + "@s.whatsapp.net";

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: "connected",
                    messagesSentDuringSession: 0
                });
                
                // CRITICAL: Only start heartbeat after pairing is confirmed done
                if (!isPairing) {
                    startSocketHeartbeat(sessionKey, sock);
                }
            }

            // CRITICAL: Don't auto-reconnect during pairing
            if (connection === "close") {

                const reason = lastDisconnect?.error?.output?.statusCode;

                console.log(`⚠️ ${sessionKey} connection closed - Reason: ${reason}`);

                // If currently pairing, don't reconnect - let pairing code endpoint handle it
                if (pairingInProgress.get(sessionKey)) {
                    console.log(`⏸️ Pairing in progress for ${sessionKey} - suppressing auto-reconnect`);
                    return;
                }

                // For non-pairing disconnects, use reconnection logic
                if (reason !== DisconnectReason.loggedOut && reason !== 401 && reason !== 403) {

                    console.log(`🔄 Attempting automatic reconnection for ${sessionKey}...`);

                    // Remove old heartbeat
                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);
                    socketHeartbeatMap.delete(sessionKey);

                    setTimeout(() => {
                        if (!sessionSockets.has(sessionKey) || !isSocketConnected(sessionKey)) {
                            console.log(`🔧 Restarting socket for ${sessionKey}...`);
                            startSocket(sessionPath, sessionKey, false);
                        }
                    }, 8000);

                } else {
                    console.log(`🚫 Session logged out ${sessionKey} (reason: ${reason})`);
                    
                    // Clean up
                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);
                    socketHeartbeatMap.delete(sessionKey);
                    
                    sessionSockets.delete(sessionKey);
                    socketHealthMap.delete(sessionKey);
                }
            }
        });

        /* ===== MESSAGE HANDLER ===== */
        sock.ev.on('messages.upsert', async (m) => {
            console.log('Message received');
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

/* ================= ENHANCED HEARTBEAT SYSTEM ================= */

function startSocketHeartbeat(sessionKey, sock) {
    
    // Clear existing heartbeat if any
    const existingHeartbeat = socketHeartbeatMap.get(sessionKey);
    if (existingHeartbeat) clearInterval(existingHeartbeat);
    
    console.log(`💓 Starting heartbeat for ${sessionKey}`);
    
    // Send a lightweight keep-alive every 30 seconds
    const heartbeat = setInterval(async () => {
        try {
            if (!isSocketConnected(sessionKey)) {
                clearInterval(heartbeat);
                socketHeartbeatMap.delete(sessionKey);
                console.log(`💔 Heartbeat stopped for ${sessionKey} (socket disconnected)`);
                return;
            }
            
            // Send heartbeat by requesting socket state
            if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                sock.ws.socket.ping();
            }
            
            const health = socketHealthMap.get(sessionKey);
            if (health) {
                health.lastHeartbeat = Date.now();
            }
            
        } catch (error) {
            console.log(`⚠️ Heartbeat error for ${sessionKey}:`, error.message);
        }
    }, 30000);
    
    socketHeartbeatMap.set(sessionKey, heartbeat);
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

        // CRITICAL: Prevent multiple simultaneous pairing attempts for same number
        if (pairingInProgress.get(number)) {
            return res.json({
                code: "Pairing already in progress for this number. Please wait.",
                error: true
            });
        }

        const sessionPath = path.join(SESSION_ROOT, number);

        // CRITICAL: Always delete and recreate fresh session for pairing
        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`🗑️ Cleared old session for ${number}`);
                // Give filesystem time to clear
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.log(`⚠️ Error clearing session: ${err.message}`);
            }
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        // Mark pairing as in progress
        pairingInProgress.set(number, true);
        console.log(`🔐 Starting pairing process for ${number}...`);

        const sock = await startSocket(sessionPath, number, true);

        if (!sock) {
            pairingInProgress.delete(number);
            return res.json({
                code: "Service Temporarily Unavailable",
                error: true,
                message: "Failed to create socket"
            });
        }

        try {
            /* CRITICAL: Wait for socket to be ready with longer timeout */
            let isReady = false;
            let waitAttempts = 0;
            const maxWaitAttempts = 60; // Wait up to 60 seconds

            while (!isReady && waitAttempts < maxWaitAttempts) {
                if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                    isReady = true;
                    console.log(`✅ Socket ready for ${number} after ${waitAttempts}s`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                waitAttempts++;
            }

            if (!isReady) {
                pairingInProgress.delete(number);
                sessionSockets.delete(number);
                return res.json({
                    code: "Socket Connection Timeout",
                    error: true
                });
            }

            console.log(`📱 Requesting pairing code for ${number}...`);

            // CRITICAL: Request pairing code with timeout
            const pairingPromise = sock.requestPairingCode(number);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Pairing code request timeout")), 30000)
            );

            let code;
            try {
                code = await Promise.race([pairingPromise, timeoutPromise]);
            } catch (timeoutErr) {
                pairingInProgress.delete(number);
                sessionSockets.delete(number);
                console.log(`⏱️ Pairing code request timed out for ${number}`);
                return res.json({
                    code: "Pairing Code Timeout - Please try again",
                    error: true
                });
            }

            if (!code) {
                pairingInProgress.delete(number);
                sessionSockets.delete(number);
                return res.json({
                    code: "Failed to generate pairing code",
                    error: true
                });
            }

            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

            console.log(`✅ Pairing code generated for ${number}: ${formattedCode}`);

            // CRITICAL: Keep socket open - don't delete it yet
            // Mark pairing as successful
            pairingInProgress.set(number, 'waiting_for_auth');

            return res.json({
                code: formattedCode,
                number,
                timestamp: new Date().toISOString(),
                error: false,
                message: "Please scan the code on your phone and confirm the pairing"
            });

        } catch (err) {
            console.log("Pairing error:", err.message);
            pairingInProgress.delete(number);
            sessionSockets.delete(number);

            return res.json({
                code: "Service Temporarily Unavailable",
                error: true,
                message: err.message
            });
        }

    } catch (err) {

        console.log("Pairing endpoint error:", err.message);

        return res.json({
            code: "Service Error",
            error: true,
            message: err.message
        });
    }
});

// ADDED: New endpoint to check pairing status and confirm completion
router.get('/check/:number', async (req, res) => {
    try {
        const number = req.params.number.replace(/[^0-9]/g, '');
        
        if (!number) {
            return res.json({ status: "error", message: "Number required" });
        }

        const sock = sessionSockets.get(number);
        
        if (!sock) {
            return res.json({
                status: "not_connected",
                number: number,
                message: "Socket not found"
            });
        }

        const isConnected = sock?.ws?.socket && sock.ws.socket.readyState === 1;
        const user = sock?.user;

        if (isConnected && user) {
            pairingInProgress.delete(number);
            console.log(`✅ Pairing confirmed for ${number}`);
            
            // Send welcome message
            try {
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
                await sock.sendMessage(jid, { text: caption }).catch(() => {});
            } catch (e) {
                console.log("Welcome message error:", e.message);
            }

            return res.json({
                status: "connected",
                authenticated: true,
                number: number,
                user: user?.name || user?.id,
                message: "✅ Pairing successful! Bot is ready."
            });
        }

        return res.json({
            status: "waiting",
            number: number,
            message: "Waiting for pairing confirmation on phone..."
        });

    } catch (err) {
        console.log("Check error:", err.message);
        return res.json({
            status: "error",
            message: err.message
        });
    }
});

module.exports = router;
