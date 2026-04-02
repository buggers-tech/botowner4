const axios = require("axios");

async function pairCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const parts = rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.pair 2547XXXXXXXX"
            });
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
                text: `🤖 Pairing Code Generated\n\n📌 Number: ${number}\n🔐 Code: ${response.data.code}\n\n👉 Open WhatsApp → Linked Devices → Link Device`
            });
        } else {
            await sock.sendMessage(chatId, { text: "❌ Pairing service failed." });
        }

    } catch (err) {
        console.error("Pair Command Error:", err);
        await sock.sendMessage(chatId, { text: "⚠ Pair command runtime error." }).catch(() => {});
    }
}

module.exports = pairCommand;
