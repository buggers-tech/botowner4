const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const channelInfo = {
    contextInfo: {
        newsletterJid: '120363416402842348@newsletter',
        newsletterName: 'BUGFIXED SULEXH TECH',
        serverMessageId: -1
    }
};

/*
========================================
GET CONFIG FILE PER BOT
========================================
*/
function getConfigFile(sock) {
    const botNumber = sock?.user?.id?.split(':')[0] || 'unknown';
    const dir = path.join(__dirname, '../data/autoStatus');

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return path.join(dir, `${botNumber}.json`);
}

/*
========================================
LOAD CONFIG
========================================
*/
function loadConfig(sock) {
    const file = getConfigFile(sock);

    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file));
        }
    } catch (err) {
        console.error('Load autoStatus config error:', err);
    }

    return { enabled: false, reactOn: false };
}

/*
========================================
SAVE CONFIG
========================================
*/
function saveConfig(sock, config) {
    const file = getConfigFile(sock);

    try {
        fs.writeFileSync(file, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Save autoStatus config error:', err);
    }
}

/*
========================================
COMMAND
========================================
*/
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

        let config = loadConfig(sock);

        if (!args || args.length === 0) {
            const status = config.enabled ? 'enabled' : 'disabled';
            const reactStatus = config.reactOn ? 'enabled' : 'disabled';

            await sock.sendMessage(chatId, {
                text: `🔄 *Auto Status Settings*\n\n📱 *Auto Status View:* ${status}\n💫 *Status Reactions:* ${reactStatus}\n\n*Commands:*\n.autostatus on - Enable auto status view\n.autostatus off - Disable auto status view\n.autostatus react on - Enable status reactions\n.autostatus react off - Disable status reactions`,
                ...channelInfo
            });
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'on') {
            config.enabled = true;
            saveConfig(sock, config);

            await sock.sendMessage(chatId, {
                text: '✅ Auto status view has been enabled!\nBot will now automatically view all contact statuses.',
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
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error occurred while managing auto status!\n' + error.message,
            ...channelInfo
        });
    }
}

/*
========================================
CHECK FUNCTIONS (UPDATED)
========================================
*/
function isAutoStatusEnabled(sock) {
    return loadConfig(sock).enabled;
}

function isStatusReactionEnabled(sock) {
    return loadConfig(sock).reactOn;
}

/*
========================================
REACT TO STATUS
========================================
*/
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled(sock)) return;

        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );

    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

/*
========================================
HANDLE STATUS UPDATE
========================================
*/
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled(sock)) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];

            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    await reactToStatus(sock, msg.key);
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else throw err;
                }
                return;
            }
        }

    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};
