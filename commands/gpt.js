const APIs = require("./utils/Api");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function gptCommand(sock, msg, args, extra) {
  try {
    const from = extra.from;
    const prefix = extra.prefix || '.';

    const prompt = args.join(' ').trim();
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctxInfo?.quotedMessage;

    if (!prompt && !quoted) {
      return await sock.sendMessage(from, {
        text: `⚠ Provide a prompt!\n\nExample:\n${prefix}gpt Hello\n${prefix}gpt image a lion`
      }, { quoted: msg });
    }

    const lower = prompt.toLowerCase();

    // =========================
    // IMAGE GENERATION
    // =========================
    if (lower.startsWith('image') || lower.startsWith('draw')) {
      const cleanPrompt = prompt.replace(/image of|image|draw/gi, '').trim();

      let imageData;
      try {
        imageData = await generateImage(cleanPrompt);
      } catch (err) {
        console.error('Image generation failed:', err);
        return await sock.sendMessage(from, { text: '❌ Failed to generate image.' }, { quoted: msg });
      }

      return await sock.sendMessage(from, {
        image: { url: imageData.url || imageData.result || `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}` },
        caption: `🖼 *Generated Image*\n\n${cleanPrompt}`
      }, { quoted: msg });
    }

    // =========================
    // IMAGE ANALYSIS (Quoted Image)
    // =========================
    if (quoted?.imageMessage) {
      const question = prompt || 'Describe this image';
      let reply;

      try {
        const res = await chatAI("User asked about an image: " + question);
        reply = res.msg || res.result;
      } catch (err) {
        console.error('Image AI error:', err);
      }

      if (!reply) reply = '🧠 I can’t fully analyze images yet, but it looks interesting.';

      return await sock.sendMessage(from, {
        text: `🖼 *Image Response*\n\n${reply}`
      }, { quoted: msg });
    }

    // =========================
    // TEXT AI
    // =========================
    let reply;
    try {
      const res = await chatAI(prompt);
      reply = res.msg || res.result;
    } catch (err) {
      console.error('AI chat error:', err);
    }

    if (!reply) reply = '⚠ AI is currently unavailable. Try again later.';

    // =========================
    // SEND RESPONSE (CHUNKED)
    // =========================
    const chunkSize = 3500;
    for (let i = 0; i < reply.length; i += chunkSize) {
      await sock.sendMessage(from, {
        text: reply.substring(i, i + chunkSize)
      }, { quoted: msg });
    }

  } catch (error) {
    console.error('GPT ERROR:', error);
    await sock.sendMessage(extra.from, {
      text: '❌ AI system error. Please try again later.'
    }, { quoted: msg });
  }
}

module.exports = gptCommand;
