const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pino = require("pino");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const SESSION_ROOT = path.join(process.cwd(), 'session_pair');
if (!fs.existsSync(SESSION_ROOT)) fs.mkdirSync(SESSION_ROOT, { recursive: true });

const sessionSockets = new Map();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cleanSession(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }

// ==============================
// Start socket
    async function startSocket(sessionKey, userNumber) {
    const sessionPath = path.join(SESSION_ROOT, sessionKey);
    const tempStatePath = path.join(sessionPath, "_temp");

    // Make sure directories exist
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
    if (!fs.existsSync(tempStatePath)) fs.mkdirSync(tempStatePath, { recursive: true });

    // Now safely call Baileys auth
    const { state, saveCreds } = await useMultiFileAuthState(tempStatePath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys) },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sessionSockets.set(sessionKey, sock);
    let giftSent = false;
    let readyForPairing = false;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "connecting") readyForPairing = true;

        if (connection === "open" && state.creds.me && !giftSent) {
            giftSent = true;
            readyForPairing = false;

            try {
                // Copy temp session to permanent folder
                fs.readdirSync(tempStatePath).forEach(file => {
                    fs.copyFileSync(path.join(tempStatePath, file), path.join(sessionPath, file));
                });
            } catch (err) {
                console.log("⚠ Failed to save session:", err.message);
            }

            const cleanNumber = state.creds.me.id.split(":")[0];
            const userJid = `${cleanNumber}@s.whatsapp.net`;
            const giftVideo = "https://files.catbox.moe/rxvkde.mp4";
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
            await sock.sendMessage(userJid, { video: { url: giftVideo }, caption, gifPlayback: true });
            console.log(`✅ Startup gift sent to ${userNumber}`);
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            if (status === DisconnectReason.loggedOut) {
                console.log(`❌ Logged out → cleaning session for ${sessionKey}`);
                sessionSockets.delete(sessionKey);
                try { cleanSession(sessionPath); } catch {}
                try { cleanSession(tempStatePath); } catch {}
            } else {
                if (!sessionSockets.has(sessionKey)) setTimeout(() => startSocket(sessionKey, userNumber), 4000);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    return { sock, isReady: () => readyForPairing };
}

// ==============================
// OPEN HTML
router.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pair.html'));
});

// ==============================
// PAIR CODE API
router.get('/code', async (req, res) => {

    try {
        let number = req.query.number;

        if (!number) return res.json({ code: "Number Required" });

        number = number.replace(/[^0-9]/g, '');

        if (!number.startsWith("254")) {
            return res.json({ code: "Use 254XXXXXXXXX format" });
        }

        // 🔥 ALWAYS NEW SOCKET FOR PAIRING
        const sock = await startSocket(number);

        // 🔥 CRITICAL WAIT (handshake)
        await sleep(2500);

        const code = await sock.requestPairingCode(number).catch(() => null);

        if (!code) return res.json({ code: "Try again" });

        return res.json({
            code: code.match(/.{1,4}/g).join("-")
        });

    } catch (err) {
        console.log("PAIR ERROR:", err);
        return res.json({ code: "Server Error" });
    }
});

module.exports = router;
