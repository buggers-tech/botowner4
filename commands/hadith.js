const axios = require("axios");

async function hadithCommand(sock, chatId, message) {
  try {
    const rawText =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";
    const query = rawText.replace(/\.hadith\s*/i, "").trim().toLowerCase();

    if (!query) {
      await sock.sendMessage(chatId, {
        text: "⚠ Usage:\n.hadith <keyword>\nExample: .hadith patience"
      });
      return;
    }

    await sock.sendMessage(chatId, { text: "⏳ Searching Sahih Bukhari..." });

    // URLs
    const listUrl = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json";
    const editionsUrl = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/";

    // Load edition info
    const infoResp = await axios.get(listUrl, { timeout: 10000 });
    const info = infoResp.data;

    // Find English Bukhari edition
    const engBukhari = info.editions.find(e => e.includes("eng-bukhari"));
    if (!engBukhari) {
      await sock.sendMessage(chatId, { text: "⚠ Sahih Bukhari not available." });
      return;
    }

    // Load hadith list
    const hadithResp = await axios.get(editionsUrl + engBukhari, { timeout: 10000 });
    const hadiths = hadithResp.data; // array of hadith objects

    // Filter matches
    const matches = hadiths.filter(h => h.body && h.body.toLowerCase().includes(query));

    if (!matches.length) {
      await sock.sendMessage(chatId, { text: `❌ No hadith found for "${query}".` });
      return;
    }

    // Limit to first 5 results
    const toSend = matches.slice(0, 5).map((h, index) => {
      let text = `🕌 *Sahih Bukhari - Result ${index + 1}*\n`;
      text += `📖 *Book*: ${h.book || "Bukhari"}\n`;
      text += `📌 *Chapter*: ${h.chapter || "Unknown"}\n`;
      text += `🔢 *Hadith #*: ${h.hadithNumber || "N/A"}\n`;
      text += `*Narrator*: ${h.narrator || "Unknown"}\n\n`;
      text += `*Text*:\n${h.body.trim()}\n`;
      text += `-----------------------------\n`;
      return text;
    }).join("\n");

    await sock.sendMessage(chatId, { text: toSend });

  } catch (err) {
    console.error("Hadith Command Error:", err.message);
    try {
      await sock.sendMessage(chatId, { text: "⚠ Could not retrieve hadith." });
    } catch {}
  }
}

module.exports = hadithCommand;
