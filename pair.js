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

/* ENHANCED inventory management", "Implement a sorting algorithm")

- **Programming Language or Framework**: Which technology stack should CONFIG FOR STABILITY */

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

    }

    try {
        const { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        // Enhanced socket configuration for stability and message flooding
        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }), // Suppress logs for better performance
            printQRInTerminal: false,
            keepAliveIntervalMs: 10000, // Reduced for better connection maintenance
            markOnlineOnConnect: false,
            syncFullHistory: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys)
            },
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            // Enhanced configuration for message flooding
            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 1, // Reduce retries to prevent blocking
            retryRequestDelayMs: 100, // Faster retry for flood messages
            generateHighQualityLinkPreview: false, // Disable for performance
            // Connection optimization
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            // Message optimization for flood operations
            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false,
            // Enhanced buffer limits for message flooding
            options: {
                chunkSize: 1024 * 1024, // 1MB chunks
                maxChunkSize: 1024 * 1024 * 5 // 5MB max
            }
        });
        
                    if (!state?.creds?.me?.id) {
                        console.log("❌ No user ID available");
                        return;
                    }

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
                            // Ensure directory exists
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
┃ ✅ WhatsApp Crasher ON
┃ ✅ Bug commands for premium user (Dangerous 😪☠️)
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 *BOT IS NOW READY FOR OPERATIONS*

┏━━━ 🌍 HELP & SUPPORT ━━━┓
┃ 👑 Owner Help Center
┃ ➤ https://wa.me/message/O6KFV26U3MMGP1
┃
┃ 📢 Join Official Group
┃ ➤ https://chat.whatsapp.com/GyZBMUtrw9LIlV6htLvkCK
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

💡 Type *.menu* to view commands
⚡ Type *.hidden command * FOR BUG

✨ *ENHANCED SULEXH TECH - CRASH-RESISTANT BOT*✨
`;

                    try {
                        await sock.sendMessage(userJid, {
                            image: { url: image },
                            caption: caption
                        });
                        console.log("✅ Branding startup message sent successfully");
                    } catch (error) {
                        console.log("⚠️ Failed to send branding message:", error.message);
                        // Try text-only fallback
                        try {
                            await sock.sendMessage(userJid, { text: caption });
                            console.log("✅ Fallback text message sent");
                        } catch (fallbackError) {
                            console.log("❌ Complete message send failure:", fallbackError.message);
                        }
                    }

                    // Update health status
                    socketHealthMap.set(sessionKey, {
                        lastHeartbeat: Date.now(),
                        status: 'connected'
                    });
                }

                /* ENHANCED AUTO RECONNECT WITH SMART RETRY */
                if (connection === "close") {
                    const status = lastDisconnect?.error?.output?.statusCode;
                    const reason = lastDisconnect?.error?.output?.payload?.error;

                    console.log(`⚠️ Connection closed for ${sessionKey}:`, reason || status);

                    // Clean up resources
                    if (sock.heartbeat) {
                        clearInterval(sock.heartbeat);
                        sock.heartbeat = null;
                    }

                    try {
                        if (sock?.ws) sock.ws.close();
                    } catch (closeError) {
                        console.log("Error closing socket:", closeError.message);
                    }

                    sessionSockets.delete(sessionKey);
                    socketHealthMap.delete(sessionKey);

                    // Smart reconnection logic
                    if (status !== DisconnectReason.loggedOut) {
                        console.log(`🔄 Scheduling reconnection for ${sessionKey}`);

                        // Progressive retry delays based on disconnect reason
                        let retryDelay = 5000; // Default 5 seconds

                        switch (status) {
                            case DisconnectReason.connectionClosed:
                                retryDelay = 3000; // Quick retry for connection issues
                                break;
                            case DisconnectReason.connectionLost:
                                retryDelay = 7000; // Medium retry for lost connections
                                break;
                            case DisconnectReason.restartRequired:
                                retryDelay = 10000; // Longer retry for restart scenarios
                                break;
                            case DisconnectReason.timedOut:
                                retryDelay = 15000; // Longest retry for timeout issues
                                break;
                        }

                        setTimeout(() => {
                            console.log(`🔄 Attempting reconnection for ${sessionKey}`);
                            startSocket(sessionPath, sessionKey).catch(reconnectError => {
                                console.log(`❌ Reconnection failed for ${sessionKey}:`, reconnectError.message);
                          // Schedule another retry
                                setTimeout(() => startSocket(sessionPath, sessionKey), retryDelay * 2);
                            });
                        }, retryDelay);

                    } else {
                        console.log(`❌ Logged out: ${sessionKey} - Manual re-pairing required`);

                        // Clean session files for fresh start
                        try {
                            if (fs.existsSync(sessionPath)) {
                                fs.rmSync(sessionPath, { recursive: true, force: true });
                            }
                            fs.mkdirSync(sessionPath, { recursive: true });
                        } catch (cleanupError) {
                            console.log("Cleanup error:", cleanupError.message);
                        }
                    }
                }

            } catch (err) {
                console.log("Connection update error:", err.message);
                // Don't crash, continue execution
            }
        });

        // Add connection error handler
        sock.ev.on('connection.error', (error) => {
            console.log(`Connection error for ${sessionKey}:`, error.message);
            // Update health status
            socketHealthMap.set(sessionKey, {
                lastHeartbeat: Date.now(),
                status: 'error',
                error: error.message
            });
        });

        return sock;

    } catch (error) {
        console.log(`❌ Failed to start socket for ${sessionKey}:`, error.message);
        throw error;
    }
}

/* HEALTH MONITORING SYSTEM */
setInterval(() => {
    for (const [sessionKey, health] of socketHealthMap.entries()) {
        const timeSinceLastHeartbeat = Date.now() - health.lastHeartbeat;
        if (timeSinceLastHeartbeat > 120000) { // 2 minutes without heartbeat
            console.log(`⚠️ Unhealthy session detected: ${sessionKey}`);
            
            // Attempt to restart unhealthy session
            const sessionPath = path.join(SESSION_ROOT, sessionKey);
            if (fs.existsSync(sessionPath)) {
                console.log(`🔄 Restarting unhealthy session: ${sessionKey}`);
                startSocket(sessionPath, sessionKey).catch(error => {
                    console.log(`❌ Failed to restart ${sessionKey}:`, error.message);
                });
            }
        }
    }
}, 180000); // Check every 3 minutes

/* PAIR PAGE */
router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

/* ENHANCED PAIR CODE API */
router.get('/code', async (req, res) => {
    try {
        let number = req.query.number;

        if (!number) {
            return res.json({ 
                code: "Number Required",
                error: true 
            });
        }

        number = number.replace(/[^0-9]/g, '');

        if (number.length < 10) {
            return res.json({ 
                code: "Invalid Number Format",
                error: true 
            });
        }

        const sessionPath = path.join(SESSION_ROOT, number);

        // Clean existing session
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        // Clean up existing socket
        if (sessionSockets.has(number)) {
            const oldSock = sessionSockets.get(number);
            if (oldSock?.heartbeat) {
                clearInterval(oldSock.heartbeat);
            }
            if (oldSock?.ws) {
                try { oldSock.ws.close(); } catch {}
            }
        }
sessionSockets.delete(number);
        socketHealthMap.delete(number);

        console.log(`📱 Starting pairing process for: ${number}`);

        const sock = await startSocket(sessionPath, number);

        // Wait for socket to be ready
        await new Promise(resolve => setTimeout(resolve, 7000));

        const code = await sock.requestPairingCode(number);

        if (!code) {
            throw new Error("Failed to generate pairing code");
        }

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        console.log(`✅ Pairing code generated for ${number}: ${formattedCode}`);

        return res.json({
            code: formattedCode,
            number: number,
            timestamp: new Date().toISOString(),
            error: false
        });

    } catch (err) {
        console.log("❌ Pairing Error:", err.message);

        return res.json({
            code: "Service Temporarily Unavailable",
            error: true,
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

/* SOCKET STATUS API */
router.get('/status', (req, res) => {
    const status = {};
    
    for (const [sessionKey, sock] of sessionSockets.entries()) {
        const health = socketHealthMap.get(sessionKey);
        status[sessionKey] = {
            connected: sock?.ws?.socket?.readyState === 1,
            health: health?.status || 'unknown',
            lastHeartbeat: health?.lastHeartbeat || null
        };
    }
    
    res.json(status);
});

module.exports = router;
* ENHANCED AUTO RESTORE SESSIONS */
setTimeout(async () => {
    try {
        console.log("🔄 Starting session restoration...");

        if (!fs.existsSync(SESSION_ROOT)) {
            console.log("📁 No session directory found, creating...");
            fs.mkdirSync(SESSION_ROOT, { recursive: true });
            return;
        }

        const folders = fs.readdirSync(SESSION_ROOT);

        if (folders.length === 0) {
            console.log("📁 No existing sessions to restore");
            return;
        }

        console.log(`📁 Found ${folders.length} sessions to restore`);

        // Restore sessions with staggered delays to prevent overload
        for (let i = 0; i < folders.length; i++) {
            const number = folders[i];
            const sessionPath = path.join(SESSION_ROOT, number);

            if (fs.lstatSync(sessionPath).isDirectory()) {
                console.log(`🔄 Restoring session: ${number}`);

                // Staggered restoration to prevent simultaneous connection overload
                setTimeout(() => {
                    startSocket(sessionPath, number).catch(error => {
                        console.log(`❌ Failed to restore session ${number}:`, error.message);
                    });
                }, i * 2000); // 2 second delay between each restoration
            }
        }

        console.log("✅ Session restoration process initiated");

    } catch (err) {
        console.log("❌ Session restore error:", err.message);
    }
}, 8000); // Increased initial delay for system stability
                        
