const fs = require("fs");
const path = require("path");
const APIs = require("./utils/Api");
const { spawn } = require("child_process");

async function aiCommand(sock, chatId, message) {
  try {
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage;
    const videoMessage = quoted?.videoMessage;

    // ===== .gpt video of <description> =====
    if (/^\.gpt\s+video\s+of/i.test(text)) {
      const prompt = text.replace(/^\.gpt\s+video\s+of\s*/i, "").trim();
      if (!prompt) {
        return await sock.sendMessage(chatId, { text: "⚠ Please provide a description.\nExample: .gpt video of a sunset on the beach" }, { quoted: message });
      }

      try {
        // Call your video generation API
        // Placeholder: using chatAI for now (replace with actual video API)
        const response = await APIs.chatAI(`Generate a video based on this description: ${prompt}`);
        await sock.sendMessage(chatId, { text: response.msg || response }, { quoted: message });
      } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ Video generation failed: " + err.message }, { quoted: message });
      }
      return;
    }

    // ===== IMAGE =====
    if (imageMessage) {
      const buffer = await sock.downloadMediaMessage(quoted, "buffer");
      const tempFile = path.join("./temp", `${Date.now()}.jpg`);
      if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");
      await fs.promises.writeFile(tempFile, buffer);

      const prompt = text.replace(/^\.ai\s*/i, "") || "Describe this image.";

      try {
        const response = await APIs.generateImage(prompt);
        await sock.sendMessage(chatId, { text: response?.result || "❌ Could not generate image." }, { quoted: message });
      } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ Image AI failed: " + err.message }, { quoted: message });
      }

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

      try {
        const framePath = path.join("./temp", `frame_${Date.now()}.jpg`);
        await new Promise((resolve, reject) => {
          const ffmpeg = spawn("ffmpeg", ["-i", tempVideo, "-vf", "select=eq(n\\,50)", "-vframes", "1", framePath]);
          ffmpeg.on("exit", resolve);
          ffmpeg.on("error", reject);
        });

        const frameBuffer = fs.readFileSync(framePath);
        const frameBase64 = frameBuffer.toString("base64");
        fs.unlinkSync(framePath);

        const response = await APIs.chatAI(`${prompt}\nHere is a key video frame (base64): ${frameBase64}`);
        await sock.sendMessage(chatId, { text: response.msg || response }, { quoted: message });

      } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ Video AI failed: " + err.message }, { quoted: message });
      }

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

    try {
      const response = await APIs.chatAI(prompt);
      await sock.sendMessage(chatId, { text: response.msg || response }, { quoted: message });
    } catch (err) {
      await sock.sendMessage(chatId, { text: "❌ AI Error: " + err.message }, { quoted: message });
    }

  } catch (err) {
    console.error("AI Command Error:", err);
    try {
      await sock.sendMessage(chatId, { text: "❌ An unexpected error occurred." }, { quoted: message });
    } catch {}
  }
}

module.exports = aiCommand;
