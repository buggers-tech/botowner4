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

// ==============================
// Start socket
async function createSocket(number) {

    const sessionPath = path.join(SESSION_ROOT, number);

    // 🔥 ALWAYS DELETE TEMP SESSION BEFORE NEW PAIR
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys)
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

        if (connection === "open") {

            const jid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

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

            console.log("✅ Connected & message sent");
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;

            if (status === DisconnectReason.loggedOut) {
                console.log("❌ Logged out → deleting session");
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        }
    });

    return sock;
}

// ==============================
// Pair route
router.get('/', async (req, res) => {

    try {
        let number = req.query.number;

        if (!number) return res.json({ code: "Number Required" });

        number = number.replace(/[^0-9]/g, '');

        if (!number.startsWith("254")) {
            return res.json({ code: "Use 254XXXXXXXXX format" });
        }

        // 🔥 Create fresh socket every time
        const sock = await createSocket(number);

        // 🔥 IMPORTANT WAIT
        await new Promise(r => setTimeout(r, 3000));

        // 🔥 REAL PAIRING CALL
        const code = await sock.requestPairingCode(number);

        return res.json({
            code: code?.match(/.{1,4}/g)?.join("-") || code
        });

    } catch (err) {
        console.log("PAIR ERROR:", err);
        return res.json({ code: "Failed. Try again" });
    }
});

module.exports = router;
