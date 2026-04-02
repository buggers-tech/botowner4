const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const channelInfo = {
    contextInfo: {
        newsletterJid: '120363161513685998@newsletter',
        newsletterName: 'BUGFIXED-SULEXH-XMD',
        serverMessageId: -1
    }
};

// Get bot number dynamically
function getBotNumber(sock) {
    return sock.user?.id?.split(':')[0] || 'unknown';
}

// Get config path per bot
function getConfigFile(sock) {
    const botNumber = getBotNumber(sock);
    const dir = path.join(__dirname, '../data/autoStatus');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${botNumber}.json`);
}

// Load config per bot
function loadConfig(sock) {
    const file = getConfigFile(sock);
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (err) {
        console.error('Load autoStatus config error:', err);
    }
    return { enabled: false, reactOn: false };
}

// Save config per bot
function saveConfig(sock, config) {
    const file = getConfigFile(sock);
    try {
        fs.writeFileSync(file, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Save autoStatus config error:', err);
    }
}

// Command to toggle auto status per bot
async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        const config = loadConfig(sock);

        // No arguments → show current status
        if (!args || args.length === 0) {
            const status = config.enabled ? 'enabled' : 'disabled';
            const reactStatus = config.reactOn ? 'enabled' : 'disabled';
            await sock.sendMessage(chatId, {
                text: `🔄 *Auto Status Settings*\n\n📱 *Auto Status View:* ${status}\n💫 *Status Reactions:* ${reactStatus}\n\n*Commands:*\n.autostatus on/off - Enable/disable auto status view\n.autostatus react on/off - Enable/disable status reactions`,
                ...channelInfo
            });
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'on') {
            config.enabled = true;
            saveConfig(sock, config);
            await sock.sendMessage(chatId, {
                text: '✅ Auto status view has been enabled!',
                ...channelInfo
            });
        } else if (command === 'off') {
            config.enabled = false;
            saveConfig(sock, config);
            await sock.sendMessage(chatId, {
                text: '❌ Auto status view has been disabled!',
                ...channelInfo
            });
        } else if (command === 'react') {
            if (!args[1]) {
                await sock.sendMessage(chatId, {
                    text: '❌ Please specify on/off for reactions!\nUse: .autostatus react on/off',
                    ...channelInfo
                });
                return;
            }

            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                config.reactOn = true;
                saveConfig(sock, config);
                await sock.sendMessage(chatId, {
                    text: '💫 Status reactions have been enabled!',
                    ...channelInfo
                });
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                saveConfig(sock, config);
                await sock.sendMessage(chatId, {
                    text: '❌ Status reactions have been disabled!',
                    ...channelInfo
                });
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid reaction command! Use: .autostatus react on/off',
                    ...channelInfo
                });
            }
        } else {
            await sock.sendMessage(chatId, {
                text: '❌ Invalid command! Use:\n.autostatus on/off\n.autostatus react on/off',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autoStatus command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error occurred while managing auto status!\n' + error.message,
            ...channelInfo
        });
    }
}

// Check if auto status is enabled for this bot
function isAutoStatusEnabled(sock) {
