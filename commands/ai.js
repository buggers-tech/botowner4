const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");

// Load API key from config.json
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const OPENAI_API_KEY = config.OPENAI_API_KEY;

// Main AI command
async function aiCommand(sock, chatId, message) {
  try {
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage;
    const videoMessage = quoted?.videoMessage;

    // ===== IMAGE =====
    if (imageMessage) {
      const buffer = await sock.downloadMediaMessage(quoted, "buffer");
      const tempFile = path.join("./temp", `${Date.now()}.jpg`);
      if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");
      await fs.promises.writeFile(tempFile, buffer);

      const prompt = text.replace(/^\.ai\s*/i, "") || "Describe this image.";
      const response = await getAIImageResponse(tempFile, prompt);

      await sock.sendMessage(chatId, { text: response }, { quoted: message });
      await fs.promises.unlink(tempFile);
      return;
    }

    // ===== VIDEO =====
    if (videoMessage) {
      const buffer = await sock.downloadMediaMessage(quoted, "buffer");
      const tempVideo = path.join("./temp", `${Date.now()}.mp4`);
      if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");
      await fs.promises.writeFile(tempVideo, buffer);

      const prompt = text.replace(/^\.ai\s*/i, "") || "Describe this video.";
      const response = await getAIVideoResponse(tempVideo, prompt);

      await sock.sendMessage(chatId, { text: response }, { quoted: message });
      await fs.promises.unlink(tempVideo);
      return;
    }

    // ===== TEXT ONLY =====
    if (!text) {
      return await sock.sendMessage(chatId, {
        text: "⚠ Please provide a question after .ai\nExample: .ai Who is the father of computers?"
      }, { quoted: message });
    }

    const prompt = text.replace(/^\.ai\s*/i, "").trim();
    const response = await getAITextResponse(prompt);
    await sock.sendMessage(chatId, { text: response }, { quoted: message });

  } catch (err) {
    console.error("AI Command Error:", err.message);
    try {
      await sock.sendMessage(chatId, { text: "❌ An error occurred. Please try again later." }, { quoted: message });
    } catch {}
  }
}

// ===== IMAGE VIA GPT-4V =====
async function getAIImageResponse(filePath, prompt) {
  try {
    const imageData = fs.readFileSync(filePath).toString("base64");
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "user", content: prompt },
          { role: "user", content: `Here is an image (base64): ${imageData}` }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    return response.data?.choices?.[0]?.message?.content || "❌ Could not process image.";
  } catch (err) {
    console.error("Image AI Error:", err.message);
    return "❌ Failed to process image.";
  }
}

// ===== VIDEO VIA GPT-4V (1 key frame) =====
async function getAIVideoResponse(filePath, prompt) {
  try {
    const framePath = path.join("./temp", `frame_${Date.now()}.jpg`);
    // Extract middle frame
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ["-i", filePath, "-vf", "select=eq(n\\,50)", "-vframes", "1", framePath]);
      ffmpeg.on("exit", resolve);
      ffmpeg.on("error", reject);
    });

    const frameData = fs.readFileSync(framePath).toString("base64");
    await fs.promises.unlink(framePath);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "user", content: prompt },
          { role: "user", content: `Here is a key video frame (base64): ${frameData}` }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    return response.data?.choices?.[0]?.message?.content || "❌ Could not process video.";
  } catch (err) {
    console.error("Video AI Error:", err.message);
    return "❌ Failed to process video.";
  }
}

// ===== TEXT VIA GPT-4 =====
async function getAITextResponse(prompt) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    return response.data?.choices?.[0]?.message?.content || "❌ Could not generate response.";
  } catch (err) {
    console.error("Text AI Error:", err.message);
    return "❌ Failed to process request.";
  }
}

module.exports = aiCommand;
