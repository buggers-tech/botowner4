const fs = require("fs");
const path = require("path");

const OWNER_NUMBER = "254768161116";

function isStrictOwner(sender) {
    return sender
        ?.split(':')[0]
        ?.split('@')[0] === OWNER_NUMBER;
}

async function depairCommand(sock, chatId, message) {

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
           PARSE MESSAGE TEXT
        ============================= */

        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const parts = rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.depair 2547xxxxxxxx"
            });
            return;
        }

        let number = parts[1].replace(/[^0-9]/g, '');

        const SESSION_ROOT = "./session_pair";
        const sessionPath = path.join(SESSION_ROOT, number);
        const trackFile = "./data/paired_users.json";

        /* =============================
           CHECK SESSION EXISTS
        ============================= */

        if (!fs.existsSync(sessionPath)) {
            await sock.sendMessage(chatId, {
                text: "⚠ Session not found."
            });
            return;
        }

        /* =============================
           DELETE SESSION
        ============================= */

        fs.rmSync(sessionPath, {
            recursive: true,
            force: true
        });

        /* =============================
           REMOVE FROM TRACK FILE
        ============================= */

        if (fs.existsSync(trackFile)) {

            let users = [];

            try {
                users = JSON.parse(
                    fs.readFileSync(trackFile, "utf8")
                );
            } catch {
                users = [];
            }

            users = users.filter(u => u.number !== number);

            fs.writeFileSync(
                trackFile,
                JSON.stringify(users, null, 2)
            );
        }

        await sock.sendMessage(chatId, {
            text: `✅ +${number} depaired successfully.`
        });

    } catch (err) {

        console.log("Depair Command Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Depair runtime error."
            });
        } catch {}
    }
}

module.exports = depairCommand;
