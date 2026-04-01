const fs = require("fs");
const path = require("path");

// Replace with your actual owner number in full international format
const OWNER_NUMBER = "254768161116";

/**
 * Flexible owner check for WhatsApp JIDs
 * Accepts formats like:
 *  - 74732951101665@lid
 *  - 254768161116@s.whatsapp.net
 *  - +254768161116
 */
function isStrictOwner(sender) {
    if (!sender) return false;
    const cleanSender = sender.replace(/\D/g, ''); // keep only digits
    const match = cleanSender.endsWith(OWNER_NUMBER);
    console.log("🔍 [DEPAIR] Checking owner - Sender:", sender, "Clean:", cleanSender, "Expected:", OWNER_NUMBER, "Match:", match);
    return match;
}

/**
 * Depair command
 * Deletes paired session and removes user from tracking file
 */
async function depairCommand(sock, chatId, message) {
    try {
        // Get sender JID
        const sender = message.key.participant || message.key.remoteJid;

        // Check if sender is the owner
        if (!isStrictOwner(sender)) {
            await sock.sendMessage(chatId, { text: "❌ This command is owner only." });
            return;
        }

        // Parse command text
        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const parts = rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, { text: "⚠ Usage:\n.depair 2547xxxxxxxx" });
            return;
        }

        let number = parts[1].replace(/[^0-9]/g, '');

        // Define session and tracking paths
        const SESSION_ROOT = "./session_pair";
        const sessionPath = path.join(SESSION_ROOT, number);
        const trackFile = "./data/paired_users.json";

        // Check if session exists
        if (!fs.existsSync(sessionPath)) {
            await sock.sendMessage(chatId, { text: "⚠ Session not found." });
            return;
        }

        // Delete session folder
        fs.rmSync(sessionPath, { recursive: true, force: true });

        // Remove user from tracking file
        if (fs.existsSync(trackFile)) {
            let users = [];
            try {
                users = JSON.parse(fs.readFileSync(trackFile, "utf8"));
            } catch {
                users = [];
            }

            users = users.filter(u => u.number !== number);
            fs.writeFileSync(trackFile, JSON.stringify(users, null, 2));
        }

        await sock.sendMessage(chatId, { text: `✅ +${number} depaired successfully.` });

    } catch (err) {
        console.error("Depair Command Error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Depair runtime error." });
        } catch {}
    }
}

module.exports = depairCommand;
