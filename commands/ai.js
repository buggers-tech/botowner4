const fs = require("fs");
const axios = require("axios");
const path = require("path");

async function aiCommand(sock, chatId, message) {
  try {
    // ============================
    // DETERMINE MESSAGE TYPE
    // ============================
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMessage = quoted?.imageMessage || quoted?.videoMessage;

    // ============================
    // REPLY WITH IMAGE OR VIDEO
    // ============================
    if (mediaMessage) {
      // Save media temporarily
      const mediaType = mediaMessage.imageMessage ? "image" : "video";
      const buffer = await sock.downloadMediaMessage(quoted, "buffer");

      const tempFile = path.join("./temp", `${Date.now()}.${mediaType === "image" ? "jpg" : "mp4"}`);
      if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");

      fs.writeFileSync(tempFile, buffer);

      // Prompt from user or default
      const prompt = text.replace(/^\.ai\s*/i, "") || "Describe this media or answer all questions in it.";

      // Call AI media processor
      const result = await processMediaWithAI(tempFile, mediaType, prompt);

      await sock.sendMessage(chatId, { text: result }, { quoted: message });

      // Cleanup temp file
      fs.unlinkSync(tempFile);
      return;
    }

    // ============================
    // NORMAL TEXT QUERY
    // ============================
    if (!text) {
      return await sock.sendMessage(chatId, {
        text: "⚠ Please provide a question after .ai\n\nExample: .ai Who is the father of computers?"
      }, { quoted: message });
    }

    const prompt = text.replace(/^\.ai\s*/i, "").trim();

    const response = await getAIResponse(prompt);

    await sock.sendMessage(chatId, { text: response }, { quoted: message });

  } catch (err) {
    console.error("AI Command Error:", err);
    try {
      await sock.sendMessage(chatId, { text: "❌ An error occurred. Please try again later." }, { quoted: message });
    } catch {}
  }
}

// ============================
// MEDIA PROCESSOR
// ============================
async function processMediaWithAI(filePath, mediaType, prompt) {
  try {
    if (mediaType === "image") {
      // Call OpenAI Vision / GPT-4V
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      formData.append("prompt", prompt);

      const response = await axios.post(
        "https://api.openai.com/v1/images/analyze",
        formData,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...formData.getHeaders() }, timeout: 60000 }
      );

      return response.data?.result || "❌ Could not process image.";
    }

    if (mediaType === "video") {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      formData.append("prompt", prompt);

      const response = await axios.post(
        "https://api.openai.com/v1/video/analyze",
        formData,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...formData.getHeaders() }, timeout: 120000 }
      );

      return response.data?.result || "❌ Could not process video.";
    }

    return "❌ Unsupported media type.";
  } catch (err) {
    console.error("Media AI Error:", err);
    return "❌ Failed to process media.";
  }
}

// ============================
// NORMAL TEXT RESPONSE
// ============================
async function getAIResponse(prompt) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 30000 }
    );

    return response.data?.choices?.[0]?.message?.content || "❌ Could not generate response.";
  } catch (err) {
    console.error("GPT Error:", err);
    return "❌ Failed to process request.";
  }
}

module.exports = aiCommand;
