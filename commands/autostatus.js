const fs = require('fs');
const path = require('path');
const { isOwnerOrSudo } = require('../lib/isOwner');

const channelInfo = {
    contextInfo: {
        newsletterJid: '120363161513685998@newsletter',
        newsletterName: 'BUGFIXED-SULEXH-XMD',
        serverMessageId: -1
    }
};

/* =========================
GET BOT NUMBER
========================= */
function getBotNumber(sock) {
    return sock.user?.id?.split(':')[0] || 'unknown';
}

/* =========================
CONFIG FILE PER BOT
========================= */
function getConfigFile(sock) {
    const botNumber = getBotNumber(sock);
    const dir = path.join(__dirname, '../data/autoStatus');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${botNumber}.json`);
}

function loadConfig(sock) {
    const file = getConfigFile(sock);
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch {}
    return { enabled: false, reactOn: false };
}

function saveConfig(sock, config) {
    const file = getConfigFile(sock);
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

/* =========================
COMMAND (OWNER + SUDO ONLY)
========================= */
async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;

        // ✅ FIXED CHECK
        const allowed = await isOwnerOrSudo(senderId);

        if (!allowed) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only for owner or sudo.',
                ...channelInfo
            });
            return;
        }

        const config = loadConfig(sock);

        // Show status
        if (!args || args.length === 0) {
            const status = config.enabled ? 'ON' : 'OFF';
            const react = config.reactOn ? 'ON' : 'OFF';

            await sock.sendMessage(chatId, {
                text: `🔄 *Auto Status*\n\n📱 View: ${status}\n💫 React: ${react}`,
                ...channelInfo
            });
            return;
        }

        const cmd = args[0].toLowerCase();

        if (cmd === 'on') {
            config.enabled = true;
            saveConfig(sock, config);
            await sock.sendMessage(chatId, { text: '✅ Auto status ON', ...channelInfo });

        } else if (cmd === 'off') {
            config.enabled = false;
            saveConfig(sock, config);
            await sock.sendMessage(chatId, { text: '❌ Auto status OFF', ...channelInfo });

        } else if (cmd === 'react') {
            const sub = args[1]?.toLowerCase();

            if (sub === 'on') {
                config.reactOn = true;
                saveConfig(sock, config);
                await sock.sendMessage(chatId, { text: '💫 Reaction ON', ...channelInfo });

            } else if (sub === 'off') {
                config.reactOn = false;
                saveConfig(sock, config);
                await sock.sendMessage(chatId, { text: '❌ Reaction OFF', ...channelInfo });

            } else {
                await sock.sendMessage(chatId, {
                    text: '⚠ Use: .autostatus react on/off',
                    ...channelInfo
                });
            }

        } else {
            await sock.sendMessage(chatId, {
                text: '⚠ Use:\n.autostatus on/off\n.autostatus react on/off',
                ...channelInfo
            });
        }

    } catch (err) {
        console.error("AutoStatus Error:", err);
        await sock.sendMessage(chatId, {
            text: '⚠ Error running autostatus',
            ...channelInfo
        });
    }
}

/* =========================
CHECKERS
========================= */
function isAutoStatusEnabled(sock) {
    return loadConfig(sock).enabled;
}

function isStatusReactionEnabled(sock) {
    return loadConfig(sock).reactOn;
}

module.exports = {
    autoStatusCommand,
    isAutoStatusEnabled,
    isStatusReactionEnabled
};
