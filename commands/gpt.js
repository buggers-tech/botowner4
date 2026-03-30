const axios = require("axios");

/**
 * Context-Aware GPT Command (FIXED + STABLE)
 */
const chatContexts = {};
const MAX_HISTORY = 10;

async function gptCommand(sock, chatId, message) {
  try {
    const rawText =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    if (!rawText) {
      return await sock.sendMessage(chatId, { text: "⚠ Please provide a prompt." });
    }

    const prompt = rawText.replace(/^\.\w+\s*/, "").trim();

    if (!prompt) {
      return await sock.sendMessage(chatId, { text: "⚠ Provide a prompt after .gpt" });
    }

    let type = "text";
    if (prompt.toLowerCase().startsWith("image of")) type = "image";

    // =========================
    // INIT CONTEXT
    // =========================
    if (!chatContexts[chatId]) chatContexts[chatId] = [];
    const context = chatContexts[chatId];

    // =========================
    // TEXT RESPONSE (FIXED)
    // =========================
    if (type === "text") {
      try {
        context.push({ role: "user", content: prompt });

        const messages = context.slice(-MAX_HISTORY);

        let answer;

        try {
          // ✅ PRIMARY (OpenAI)
          const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
              model: "gpt-4o-mini", // ✅ stable + cheap
              messages,
              temperature: 0.7,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              timeout: 30000,
            }
          );

          answer = response?.data?.choices?.[0]?.message?.content;

        } catch (err) {
          console.log("⚠ OpenAI failed → switching to fallback");

          // ✅ FALLBACK (FREE API)
          const fallback = await axios.get(
            `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(prompt)}`
          );

          answer = fallback?.data?.result || "⚠ No response from fallback.";
        }

        if (!answer) answer = "⚠ AI returned empty response.";

        context.push({ role: "assistant", content: answer });

        // Split long messages
        const chunkSize = 3800;
        for (let i = 0; i < answer.length; i += chunkSize) {
          await sock.sendMessage(chatId, {
            text: answer.substring(i, i + chunkSize),
          });
        }

      } catch (err) {
        console.error("GPT TEXT ERROR:", err?.response?.data || err.message);
        await sock.sendMessage(chatId, { text: "❌ Failed to generate text." });
      }
    }

    // =========================
    // IMAGE GENERATION (FIXED)
    // =========================
    else if (type === "image") {
      try {
        let imgUrl;

        try {
          // ✅ OpenAI image (NEW API)
          const imgResp = await axios.post(
            "https://api.openai.com/v1/images/generations",
            {
              model: "gpt-image-1",
              prompt: prompt,
              size: "1024x1024",
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );

          imgUrl = imgResp?.data?.data?.[0]?.url;

        } catch (err) {
          console.log("⚠ Image API failed → fallback");

          // ✅ fallback image API
          imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        }

        if (!imgUrl) throw new Error("No image generated");

        await sock.sendMessage(chatId, {
          image: { url: imgUrl },
          caption: `🖼 Generated Image:\n${prompt}`,
        });

      } catch (err) {
        console.error("IMAGE ERROR:", err.message);
        await sock.sendMessage(chatId, { text: "❌ Failed to generate image." });
      }
    }

    // =========================
    // VIDEO (SAFE FALLBACK)
    // =========================
    else if (prompt.toLowerCase().startsWith("video of")) {
      try {
        // ⚠ Real video APIs are unstable → give safe response
        await sock.sendMessage(chatId, {
          text: `🎬 Video generation is limited.\n\nBut here’s a description:\n\n${prompt}`,
        });

      } catch (err) {
        console.error("VIDEO ERROR:", err.message);
        await sock.sendMessage(chatId, { text: "❌ Failed to generate video." });
      }
    }

  } catch (err) {
    console.error("GPT COMMAND ERROR:", err?.response?.data || err.message);

    try {
      await sock.sendMessage(chatId, {
        text: "⚠ GPT command runtime error.",
      });
    } catch {}
  }
}

module.exports = gptCommand;
