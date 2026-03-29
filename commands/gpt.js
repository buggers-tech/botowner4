const axios = require("axios");

/**
 * Context-Aware GPT Command
 * Stores conversation per chat to maintain context
 */
const chatContexts = {}; // { chatId: [{role: 'user'|'assistant', content: '...'}] }

const MAX_HISTORY = 10; // Last 10 messages per chat to limit token usage

async function gptCommand(sock, chatId, message) {
  try {
    const rawText =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    if (!rawText) {
      await sock.sendMessage(chatId, { text: "⚠ Please provide a prompt." });
      return;
    }

    const prompt = rawText.replace(/^\.\w+\s*/, "").trim();
    if (!prompt) {
      await sock.sendMessage(chatId, { text: "⚠ Provide a prompt after .gpt" });
      return;
    }

    let type = "text";
    if (prompt.toLowerCase().startsWith("image of")) type = "image";
    else if (prompt.toLowerCase().startsWith("video of")) type = "video";

    // =========================
    // Initialize context for chat
    // =========================
    if (!chatContexts[chatId]) chatContexts[chatId] = [];
    const context = chatContexts[chatId];

    // =========================
    // TEXT RESPONSE
    // =========================
    if (type === "text") {
      try {
        context.push({ role: "user", content: prompt });

        // Keep last MAX_HISTORY messages only
        const messages = context.slice(-MAX_HISTORY);

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4",
            messages,
            max_tokens: 3000,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            timeout: 45000,
          }
        );

        let answer = response?.data?.choices?.[0]?.message?.content || "⚠ GPT returned empty response.";

        // Save GPT response in context
        context.push({ role: "assistant", content: answer });

        // Split long messages
        const chunkSize = 3800;
        for (let i = 0; i < answer.length; i += chunkSize) {
          const chunk = answer.substring(i, i + chunkSize);
          await sock.sendMessage(chatId, { text: chunk });
        }
      } catch (err) {
        console.error("GPT Text Error:", err.message || err);
        await sock.sendMessage(chatId, { text: "❌ Failed to generate text." });
      }
    }

    // =========================
    // IMAGE GENERATION
    // =========================
    else if (type === "image") {
      try {
        const imgResp = await axios.post(
          "https://api.openai.com/v1/images/generations",
          { prompt, n: 1, size: "1024x1024" },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            timeout: 30000,
          }
        );

        const imgUrl = imgResp?.data?.data?.[0]?.url;
        if (!imgUrl) throw new Error("No image returned.");

        await sock.sendMessage(chatId, {
          image: { url: imgUrl },
          caption: `🖼 Generated Image:\n${prompt}`,
        });
      } catch (err) {
        console.error("GPT Image Error:", err.message || err);
        await sock.sendMessage(chatId, { text: "❌ Failed to generate image." });
      }
    }

    // =========================
    // VIDEO GENERATION via D-ID API
    // =========================
    else if (type === "video") {
      try {
        const videoResp = await axios.post(
          "https://api.d-id.com/talks",
          {
            script: { type: "text", input: prompt },
            config: { background: "white" },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.DID_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          }
        );

        const videoUrl = videoResp?.data?.result_url || null;
        if (!videoUrl) throw new Error("Video generation failed.");

        await sock.sendMessage(chatId, {
          video: { url: videoUrl },
          caption: `🎬 Generated Video:\n${prompt}`,
        });
      } catch (err) {
        console.error("GPT Video Error:", err.message || err);
        await sock.sendMessage(chatId, { text: "❌ Failed to generate video." });
      }
    }
  } catch (err) {
    console.error("GPT Command Runtime Error:", err.message || err);
    try {
      await sock.sendMessage(chatId, { text: "⚠ GPT command runtime error." });
    } catch {}
  }
}

module.exports = gptCommand;
