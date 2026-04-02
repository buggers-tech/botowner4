const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

/**
 * Get config path per bot
 */
function getConfigPath(sock) {
    if (!sock?.user?.id) return null;
    const botNumber = sock.user.id.split(':')[0];
    const dir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `autoread_${botNumber}.json`);
}

/**
 * Initialize or read config
 */
function initConfig(sock) {
    const configPath = getConfigPath(sock);
    if (!configPath) return { enabled: false };
    if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
        return { enabled: false };
    }
}

/**
 * Toggle autoread
 */
async function autoreadCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!',
                contextInfo: {
                    newsletterJid: '0029VbAD3222f3EIZyXe6w16@broadcast',
                    newsletterName: 'BUGFIXED-SULEXH-XMD',
                    serverMessageId: -1
                }
            });
            return;
        }

        const args =
            message.message?.conversation?.trim().split(' ').slice(1) ||
            message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) ||
            [];

        const config = initConfig(sock);

        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') config.enabled = true;
            else if (action === 'off' || action === 'disable') config.enabled = false;
            else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autoread on/off',
                    contextInfo: {
                        newsletterJid: '0029VbAD3222f3EIZyXe6w16@broadcast',
                        newsletterName: 'BUGFIXED-SULEXH-XMD',
                        serverMessageId: -1
                    }
                });
                return;
            }
        } else {
            config.enabled = !config.enabled;
        }

        // Save
        const configPath = getConfigPath(sock);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await sock.sendMessage(chatId, {
            text: `✅ Auto-read has been ${config.enabled ? 'enabled' : 'disabled'}!`,
            contextInfo: {
                newsletterJid: '0029VbAD3222f3EIZyXe6w16@broadcast',
                newsletterName: 'BUGFIXED-SULEXH-XMD',
                serverMessageId: -1
            }
        });

    } catch (error) {
        console.error('Error in autoread command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error processing command!',
            contextInfo: {
                newsletterJid: '0029VbAD3222f3EIZyXe6w16@broadcast',
                newsletterName: 'BUGFIXED-SULEXH-XMD',
                serverMessageId: -1
            }
        });
    }
}

/**
 * Check if autoread is enabled
 */
function isAutoreadEnabled(sock) {
    try {
        const config = initConfig(sock);
        return config.enabled;
    } catch {
        return false;
    }
}

/**
 * Check if bot is mentioned
 */
function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;
    const types = ['extendedTextMessage','imageMessage','videoMessage','stickerMessage','documentMessage','audioMessage','contactMessage','locationMessage'];
    for (const t of types) {
        if (message.message[t]?.contextInfo?.mentionedJid?.includes(botNumber)) return true;
    }

    const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        message.message.videoMessage?.caption || '';

    if (!text) return false;

    const botId = botNumber.split('@')[0];
    if (text.includes(`@${botId}`)) return true;

    const botNames = [global.botname?.toLowerCase(), 'bot'];
    return botNames.some(n => text.toLowerCase().includes(n));
}

/**
 * Handle autoread
 */
async function handleAutoread(sock, message) {
    if (!isAutoreadEnabled(sock)) return false;

    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    if (isBotMentionedInMessage(message, botNumber)) return false;

    const key = {
        remoteJid: message.key.remoteJid,
        id: message.key.id,
        participant: message.key.participant || message.key.remoteJid
    };

    await sock.readMessages([key]);
    return true;
}

module.exports = {
    autoreadCommand,
    handleAutoread,
    isAutoreadEnabled,
    isBotMentionedInMessage
};
