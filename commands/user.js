const fs = require("fs");

const OWNER_NUMBER = "254768161116";

function isStrictOwner(sender) {
    if (!sender) return false;
    const cleanSender = sender.split(':')[0]?.split('@')[0];
    console.log("🔍 [USER] Checking owner - Sender:", sender, "Clean:", cleanSender, "Expected:", OWNER_NUMBER, "Match:", cleanSender === OWNER_NUMBER);
    return cleanSender === OWNER_NUMBER;
}

async function userCommand(sock, chatId, message) {

    try {

        /* =============================
           OWNER AUTH (FIXED PROPERLY)
        ============================= */

        const sender =
            message.key.participant || message.key.remoteJid;

        if (!isStrictOwner(sender)) {
            await sock.sendMessage(chatId, {
                text: "❌ This command is owner only."
            });
            return;
        }

        /* =============================
           TRACK FILE CHECK
        ============================= */

        const trackFile = "./data/paired_users.json";

        if (!fs.existsSync(trackFile)) {
            await sock.sendMessage(chatId, {
                text: "⚠ No paired users found."
            });
            return;
        }

        /* =============================
           SAFE JSON PARSE
        ============================= */

        let users = [];

        try {
            users = JSON.parse(
                fs.readFileSync(trackFile, "utf8")
            );
        } catch {
            users = [];
        }

        if (!users.length) {
            await sock.sendMessage(chatId, {
                text: "⚠ No active paired users."
            });
            return;
        }

        /* =============================
           BUILD OUTPUT TEXT
        ============================= */

        let text = "👑 *Active Paired Users*\n\n";

        users.forEach((u, i) => {
            text += `${i + 1}. +${u.number}\n`;
        });

        await sock.sendMessage(chatId, { text });

    } catch (err) {

        console.log("User Command Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ User runtime error."
            });
        } catch {}
    }
}

module.exports = userCommand;