const axios = require("axios");
const settings = require("./settings");

async function pairCommand(sock, chatId, message) {
    try {

        /* =============================
           OWNER AUTH (PROJECT SETTINGS)
        ============================= */

        if (!message.key) return;

        const senderNumber = message.key.participant
            ? message.key.participant.split("@")[0]
            : message.key.remoteJid?.split("@")[0];

        if (senderNumber !== settings.ownerNumber) {
            await sock.sendMessage(chatId, {
                text: "❌ Owner only command."
            });
            return;
        }

        /* =============================
           MESSAGE PARSING
        ============================= */

        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const parts = rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.pair 2547XXXXXXXX"
            });
            return;
        }

        const number = parts[1].replace(/[^0-9]/g, "");

        if (!number) {
            await sock.sendMessage(chatId, {
                text: "⚠ Invalid number format."
            });
            return;
        }

        /* =============================
           API REQUEST
        ============================= */

        const apiUrl =
            `https://bugbot-i3yc.onrender.com/pair/code?number=${number}`;

        const response = await axios.get(apiUrl, {
            timeout: 20000
        });

        if (response?.data?.code) {

            await sock.sendMessage(chatId, {
                text:
`🤖 *Pairing Code Generated*

📌 Number: ${number}
🔐 Code: ${response.data.code}

👉 Open WhatsApp
👉 Linked Devices → Link Device`
            });

        } else {
            await sock.sendMessage(chatId, {
                text: "❌ Pairing service failed."
            });
        }

    } catch (err) {

        console.log("Pair Command Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Pairing runtime error."
            });
        } catch {}

    }
}

module.exports = pairCommand;
