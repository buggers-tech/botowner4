const fs = require("fs");
const path = require("path");

async function depairCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const parts = rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, { text: "⚠ Usage:\n.depair 2547XXXXXXXX" });
            return;
        }

        const number = parts[1].replace(/\D/g, "");
        const SESSION_ROOT = "./session_pair";
        const sessionPath = path.join(SESSION_ROOT, number);
        const trackFile = "./data/paired_users.json";

        if (!fs.existsSync(sessionPath)) {
            await sock.sendMessage(chatId, { text: "⚠ Session not found." });
            return;
        }

        fs.rmSync(sessionPath, { recursive: true, force: true });

        if (fs.existsSync(trackFile)) {
            let users = [];
            try { users = JSON.parse(fs.readFileSync(trackFile, "utf8")); } catch {}
            users = users.filter(u => u.number !== number);
            fs.writeFileSync(trackFile, JSON.stringify(users, null, 2));
        }

        await sock.sendMessage(chatId, { text: `✅ +${number} depaired successfully.` });

    } catch (err) {
        console.error("Depair Command Error:", err);
        await sock.sendMessage(chatId, { text: "⚠ Depair runtime error." }).catch(() => {});
    }
}

module.exports = depairCommand;
