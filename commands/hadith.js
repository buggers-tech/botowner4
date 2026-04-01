const axios = require("axios");

async function hadithCommand(sock, chatId, message) {
    try {
        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const query = rawText.replace(/\.hadith\s*/i, "").trim();

        if (!query) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.hadith <topic or question>\n\nExample: .hadith knowledge\n.hadith patience"
            });
            return;
        }

        await sock.sendMessage(chatId, {
            text: "⏳ Searching Sahih Bukhari..."
        });

        try {
            // Using Islamic API
            const response = await axios.get(
                `https://hadith-api.herokuapp.com/hadith/Bukhari?search=${encodeURIComponent(query)}`,
                { timeout: 10000 }
            );

            if (response.data && response.data.hadith) {
                const hadith = response.data.hadith;
                
                let text = `🕌 *Sahih Bukhari - ${query}*\n\n`;
                text += `📖 *Book*: ${hadith.book || "Bukhari"}\n`;
                text += `📌 *Chapter*: ${hadith.chapter || "Unknown"}\n`;
                text += `🔢 *Hadith #*: ${hadith.hadithNumber || "N/A"}\n\n`;
                text += `*Narrator*: ${hadith.narrator || "Unknown"}\n\n`;
                text += `*Text*:\n${hadith.text || hadith.english || "No text available"}\n\n`;
                text += `_${new Date().toLocaleDateString()}_`;

                await sock.sendMessage(chatId, { text });
            } else {
                await sock.sendMessage(chatId, {
                    text: `⚠ No hadith found for: "${query}"`
                });
            }
        } catch (apiErr) {
            console.error("API Error:", apiErr);
            await sock.sendMessage(chatId, {
                text: "⚠ Could not fetch hadith. Please try again."
            });
        }

    } catch (err) {
        console.log("Hadith Command Error:", err);
        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Hadith error."
            });
        } catch {}
    }
}

module.exports = hadithCommand;
