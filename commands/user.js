const fs = require("fs");
const { isStrictOwner } = require("../lib/isOwner");

async function userCommand(sock, chatId, message) {
    try {
        const sender = message.key?.participant || message.key?.remoteJid;

        // ✅ Owner-only check
        if (!isStrictOwner(sender)) {
            await sock.sendMessage(chatId, { text: "❌ This command is only for the BOT OWNER." });
            return;
        }

        const trackFile = "./data/paired_users.json";

        if (!fs.existsSync(trackFile)) {
            await sock.sendMessage(chatId, { text: "⚠ No paired users found." });
            return;
        }

        let users = [];
        try { users = JSON.parse(fs.readFileSync(trackFile, "utf8")); } catch {}
        if (!users.length) {
            await sock.sendMessage(chatId, { text: "⚠ No active paired users." });
            return;
        }

        let text = "👑 *Active Paired Users*\n\n";
        users.forEach((u, i) => { text += `${i + 1}. +${u.number}\n`; });

        await sock.sendMessage(chatId, { text });

    } catch (err) {
        console.error("User Command Error:", err);
        await sock.sendMessage(chatId, { text: "⚠ User runtime error." }).catch(() => {});
    }
}

module.exports = userCommand;
