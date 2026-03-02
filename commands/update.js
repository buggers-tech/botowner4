const { exec } = require("child_process");
const isOwnerOrSudo = require("../lib/isOwner");
const settings = require("../settings");

let updating = false;

/* =============================
   RUN SHELL COMMAND
============================= */
function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout) => {
            if (err) return reject(err.message);
            resolve(stdout);
        });
    });
}

/* =============================
   UPDATE COMMAND
============================= */
async function updateCommand(sock, chatId, message) {

    if (updating) return;
    updating = true;

    try {

        const senderId =
            message.key.participant ||
            message.key.remoteJid;

        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: "❌ Owner only command."
            });
            updating = false;
            return;
        }

        await sock.sendMessage(chatId, {
            text: "🔄 Updating from GitHub repository..."
        });

        /* =============================
           FORCE SPECIFIC REPOSITORY
        ============================= */

        await run("git init");

        await run(
            "git remote remove origin || true"
        );

        await run(
            "git remote add origin https://github.com/botowner4/BUGBOT.git"
        );

        await run("git fetch origin");

        const gitOutput = await run(
            "git reset --hard origin/main"
        );

        await sock.sendMessage(chatId, {
            text:
                "✅ Update successful!\n\n📄 Changes:\n" +
                gitOutput
        });

        /* =============================
           OPTIONAL REDEPLOY TRIGGER
        ============================= */

        if (settings.updateDeployHook) {
            const axios = require("axios");
            await axios.post(settings.updateDeployHook);
        }

    } catch (err) {

        console.log(err);

        await sock.sendMessage(chatId, {
            text: "❌ Update failed:\n" + err
        });

    }

    updating = false;
}

module.exports = updateCommand;
