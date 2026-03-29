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
async function startSocket(number) {

    const sessionPath = path.join(SESSION_ROOT, number);
    const tempPath = path.join(sessionPath, "_temp");

    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys)
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sessionSockets.set(number, sock);
    let sent = false;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

        if (connection === "open" && state.creds.me && !sent) {
            sent = true;

            // SAVE SESSION PERMANENTLY
            if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

            fs.readdirSync(tempPath).forEach(f => {
                fs.copyFileSync(path.join(tempPath, f), path.join(sessionPath, f));
            });

            const jid = state.creds.me.id.split(":")[0] + "@s.whatsapp.net";

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

            await sock.sendMessage(jid, {
                video: { url: "https://files.catbox.moe/rxvkde.mp4" },
                caption,
                gifPlayback: true
            });

            console.log("✅ Startup message sent");
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;

            if (status === DisconnectReason.loggedOut) {
                console.log("❌ Logged out → cleaning session");
                sessionSockets.delete(number);
                cleanSession(sessionPath);
                cleanSession(tempPath);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    return sock;
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
