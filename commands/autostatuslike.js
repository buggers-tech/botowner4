const fs = require('fs');
const path = require('path');

/*
========================================
GET FILE PATH PER BOT
========================================
*/
function getDataFile(sock) {
    if (!sock?.user?.id) return null;

    const botNumber = sock.user.id.split(":")[0];
    const dir = path.join(__dirname, '../data/autolikestatus');

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, `${botNumber}.json`);
}

/*
========================================
READ STATE
========================================*/
function readState(sock) {
    const file = getDataFile(sock);
    if (!file) return { enabled: false };

    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        return { enabled: false };
    }
}

/*
========================================
COMMAND TO TOGGLE AUTO-LIKE STATUS
========================================*/
async function autolikestatusCommand(sock, chatId, message) {
    const arg = message.message?.conversation?.split(' ')[1];
    const currentState = readState(sock);

    const newState =
        arg === 'on' ? true :
        arg === 'off' ? false :
        !currentState.enabled;

    const file = getDataFile(sock);
    if (!file) return;

    fs.writeFileSync(file, JSON.stringify({ enabled: newState }, null, 2));

    await sock.sendMessage(chatId, {
        text: `❤️ Auto-like status is now *${newState ? 'ON' : 'OFF'}*`
    });
}

/*
========================================
HANDLE STATUS VIEW AND AUTO-LIKE
========================================*/
async function handleAutolikeStatus(sock, statusUpdate) {
    const state = readState(sock);
    if (!state.enabled) return; // Sleep mode when OFF

    try {
        // Only react to status updates from contacts
        if (!statusUpdate?.key?.fromMe && statusUpdate?.message?.statusMessage) {
            await sock.sendMessage(statusUpdate.key.remoteJid, {
                react: { text: "❤️", key: statusUpdate.key }
            });
        }
    } catch (err) {
        console.error("Error auto-liking status:", err);
    }
}

/*
========================================
CHECK IF ENABLED
========================================*/
function isAutolikestatusEnabled(sock) {
    return readState(sock).enabled;
}

module.exports = {
    autolikestatusCommand,
    handleAutolikeStatus,
    isAutolikestatusEnabled,
    readState
};
