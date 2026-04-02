const axios = require("axios");

async function gptCommand(sock, chatId, message) {
    try {
        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const prompt = rawText.replace(/^\.\w+\s*/, "").trim();
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!prompt && !quoted) {
            return await sock.sendMessage(chatId, {
                text: "⚠ Provide a prompt or reply to an image."
            });
        }

        const lower = prompt.toLowerCase();

        // =========================
        // 🖼 IMAGE GENERATION
        // =========================
        if (lower.startsWith("image") || lower.startsWith("draw")) {
            const cleanPrompt = prompt.replace(/image of|image|draw/gi, "").trim();

            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}`;

            return await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: `🖼 Generated Image:\n${cleanPrompt}`
            });
        }

        // =========================
        // 🎬 VIDEO (FREE METHOD)
        // =========================
        if (lower.startsWith("video")) {
            const cleanPrompt = prompt.replace(/video of|video/gi, "").trim();

            return await sock.sendMessage(chatId, {
                text: `🎬 Video for: ${cleanPrompt}\n\n🔗 https://www.youtube.com/results?search_query=${encodeURIComponent(cleanPrompt)}`
            });
        }

        // =========================
        // 🧠 IMAGE REPLY (SMART FAKE)
        // =========================
        if (quoted?.imageMessage) {
            const question = prompt || "Describe this image";

            let answer = null;

            try {
                const res = await axios.get(
                    `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent("User asked about an image: " + question)}`
                );
                answer = res?.data?.response;
            } catch {}

            if (!answer) {
                answer = "🧠 I can't fully analyze images, but it looks interesting.";
            }

            return await sock.sendMessage(chatId, {
                text: `🖼 Image Response:\n${answer}`
            });
        }

        // =========================
        // 🤖 TEXT AI (MULTI API)
        // =========================
        let reply = null;

        try {
            const res = await axios.get(
                `https://api.safone.dev/ai/chat?message=${encodeURIComponent(prompt)}`
            );
            reply = res?.data?.reply;
        } catch {}

        if (!reply) {
            try {
                const res = await axios.get(
                    `https://luminai.my.id/?text=${encodeURIComponent(prompt)}`
                );
                reply = res?.data?.result;
            } catch {}
        }

        if (!reply) {
            try {
                const res = await axios.get(
                    `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`
                );
                reply = res?.data?.response;
            } catch {}
        }

        if (!reply) {
            reply = "⚠ AI is not responding right now.";
        }

        const chunkSize = 3500;
        for (let i = 0; i < reply.length; i += chunkSize) {
            await sock.sendMessage(chatId, {
                text: reply.substring(i, i + chunkSize)
            });
        }

    } catch (err) {
        console.error("GPT ERROR:", err.message);

        await sock.sendMessage(chatId, {
            text: "❌ AI system error."
        });
    }
}

module.exports = gptCommand;
