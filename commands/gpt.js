const axios = require("axios");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

async function gptCommand(sock, msg, args, extra) {
    try {
        const from = extra.from;
        const prefix = extra.prefix || ".";

        // ===== GET PROMPT =====
        const prompt = args.join(" ").trim();

        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctxInfo?.quotedMessage;

        if (!prompt && !quoted) {
            return await sock.sendMessage(from, {
                text: `⚠ Provide a prompt!\n\nExample:\n${prefix}gpt Hello\n${prefix}gpt image a lion`
            }, { quoted: msg });
        }

        const lower = prompt.toLowerCase();

        // =========================
        // 🖼 IMAGE GENERATION
        // =========================
        if (lower.startsWith("image") || lower.startsWith("draw")) {
            const cleanPrompt = prompt.replace(/image of|image|draw/gi, "").trim();

            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}`;

            return await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: `🖼 *Generated Image*\n\n${cleanPrompt}`
            }, { quoted: msg });
        }

        // =========================
        // 🧠 IMAGE ANALYSIS (FAKE AI)
        // =========================
        if (quoted?.imageMessage) {
            const question = prompt || "Describe this image";

            let reply = null;

            try {
                const res = await axios.get(
                    `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent("User asked about an image: " + question)}`,
                    { timeout: 15000 }
                );
                reply = res?.data?.response;
            } catch (err) {
                console.log("Image AI fallback error:", err.message);
            }

            if (!reply) {
                reply = "🧠 I can’t fully analyze images yet, but it looks interesting.";
            }

            return await sock.sendMessage(from, {
                text: `🖼 *Image Response*\n\n${reply}`
            }, { quoted: msg });
        }

        // =========================
        // 🤖 TEXT AI (MAIN SYSTEM)
        // =========================
        let reply = null;

        // PRIMARY API (STRONG)
        try {
            const res = await axios.post(
                "https://api.nexray.web.id/ai/chatgpt",
                { text: prompt },
                {
                    timeout: 60000,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            reply = res?.data?.result;
        } catch (err) {
            console.log("Primary API failed:", err.message);
        }

        // FALLBACK (LIGHT AI)
        if (!reply) {
            try {
                const res = await axios.get(
                    `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`,
                    { timeout: 15000 }
                );
                reply = res?.data?.response;
            } catch (err) {
                console.log("Fallback API failed:", err.message);
            }
        }

        if (!reply) {
            reply = "⚠ AI is currently unavailable. Try again later.";
        }

        // =========================
        // 📤 SEND RESPONSE (SAFE SPLIT)
        // =========================
        const chunkSize = 3500;

        for (let i = 0; i < reply.length; i += chunkSize) {
            await sock.sendMessage(from, {
                text: reply.substring(i, i + chunkSize)
            }, { quoted: msg });
        }

    } catch (err) {
        console.error("GPT ERROR:", err);

        await sock.sendMessage(extra.from, {
            text: "❌ AI system error."
        }, { quoted: msg });
    }
}

module.exports = gptCommand;
