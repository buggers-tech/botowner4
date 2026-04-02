const fs = require("fs");

async function userCommand(sock, chatId, message) {
    try {
        // Path to track paired users
        const trackFile = "./data/paired_users.json";

        // Check if track file exists
        if (!fs.existsSync(trackFile)) {
            await sock.sendMessage(chatId, { text: "⚠ No paired users found." });
            return;
        }

        // Safely read JSON
        let users = [];
        try {
            users = JSON.parse(fs.readFileSync(trackFile, "utf8"));
        } catch {
            users = [];
        }

        // Check if any paired users exist
        if (!users.length) {
            await sock.sendMessage(chatId, { text: "⚠ No active paired users." });
            return;
        }

        // Build output
        let text = "👑 *Active Paired Users*\n\n";
        users.forEach((u, i) => {
            text += `${i + 1}. +${u.number}\n`;
        });

        // Send list to chat
        await sock.sendMessage(chatId, { text });

    } catch (err) {
        console.error("User Command Error:", err);
        await sock.sendMessage(chatId, { text: "⚠ User runtime error." }).catch(() => {});
    }
}

module.exports = userCommand;
