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
    const dir = path.join(__dirname, '../data/autotyping'); // folder only

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, `${botNumber}.json`); // file per bot
}

/*
========================================
READ STATE
========================================
*/
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
COMMAND
========================================
*/
async function autotypingCommand(sock, chatId, message) {
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
        text: `⌨️ Autotyping is now *${newState ? 'ON' : 'OFF'}*`
    });
}

/*
========================================
AUTO TYPING HANDLER
========================================
*/
const activeIntervals = {};

async function handleAutotypingForMessage(sock, chatId) {
    const state = readState(sock);
    if (!state.enabled) return;

    if (!sock?.user?.id) return;

    const botId = sock.user.id;
    const key = `${botId}_${chatId}`;

    if (activeIntervals[key]) return;

    try { await sock.sendPresenceUpdate('composing', chatId); } catch {}

    const interval = setInterval(async () => {
        const currentState = readState(sock);

        if (!currentState.enabled) {
            clearInterval(interval);
            delete activeIntervals[key];
            return;
        }

        try { await sock.sendPresenceUpdate('composing', chatId); } catch {}
    }, 5000);

    activeIntervals[key] = interval;
}

/*
========================================
RESTORE ON BOT STARTUP
========================================
*/
function restoreAutotyping(sock, chatIds) {
    const state = readState(sock);
    if (!state.enabled) return;

    chatIds.forEach(chatId => handleAutotypingForMessage(sock, chatId));
}

module.exports = {
    autotypingCommand,
    handleAutotypingForMessage,
    restoreAutotyping
};
