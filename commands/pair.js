const axios = require("axios");

// Owner number in full international format
const OWNER_NUMBER = "254768161116";

/**
 * Flexible owner check
 * Works with:
 * - 254768161116@s.whatsapp.net
 * - 74732951101665@lid
 * - +254768161116
 */
function isStrictOwner(sender) {
    if (!sender) return false;
    const cleanSender = sender.replace(/\D/g, ''); // keep only digits
    const match = cleanSender.endsWith(OWNER_NUMBER);
    console.log("🔍 [PAIR] Checking owner - Sender:", sender, "Clean:", cleanSender, "Expected:", OWNER_NUMBER, "Match:", match);
    return match;
}

async function pairCommand(sock, chatId, message) {
    try {
        const sender = message.key?.participant || message.key?.remoteJid;

        // ✅ OWNER ONLY CHECK
        if (!isStrictOwner(sender)) {
            await sock.sendMessage(chatId, { text: "❌ This command is only for BOT OWNER" });
            return;
        }

        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const parts = rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, { text: "⚠ Usage:\n.pair 2547XXXXXXXX" });
            return;
        }

        const number = parts[1].replace(/\D/g, "");

        if (!number) {
            await sock.sendMessage(chatId, { text: "⚠ Invalid number format." });
            return;
        }

        const apiUrl = `https://bugbot-luyr.onrender.com/pair/code?number=${number}`;

        const response = await axios.get(apiUrl, { timeout: 20000 });

        if (response?.data?.code) {
            await sock.sendMessage(chatId, {
                text:
`🤖 Pairing Code Generated

📌 Number: ${number}
🔐 Code: ${response.data.code}

👉 Open WhatsApp → Linked Devices → Link Device`
            });
        } else {
            await sock.sendMessage(chatId, { text: "❌ Pairing service failed." });
        }

    } catch (err) {
        console.error("Pair Command Error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Pair command runtime error." });
        } catch {}
    }
}

module.exports = pairCommand;
