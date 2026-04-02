const fs = require('fs');
const path = require('path');

// Tracks intervals per chat
const activeIntervals = {};

/**
 * Get file path per bot
 */
function getDataFile(sock) {
    if (!sock?.user?.id) return null;

    const botNumber = sock.user.id.split(":")[0];
    const dir = path.join(__dirname, '../data/autorecording');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, `${botNumber}.json`);
}

/**
 * Read current state
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

/**
 * Toggle autorecording via command
 */
async function autorecordingCommand(sock, chatId, message) {
    try {
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
            text: `🎙 Autorecording is now *${newState ? 'ON' : 'OFF'}*`
        });

        // Trigger handler immediately for new state
        if (newState) await handleAutorecordingForMessage(sock, chatId);
    } catch (err) {
        console.error("Autorecording command error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Autorecording command failed." });
        } catch {}
    }
}

/**
 * Handle autorecording presence for a chat
 */
async function handleAutorecordingForMessage(sock, chatId) {
    if (!sock?.user?.id) return;

    const botId = sock.user.id;
    const key = `${botId}_${chatId}`;
    const state = readState(sock);

    if (!state.enabled) return;
    if (activeIntervals[key]) return; // already running

    try {
        await sock.sendPresenceUpdate('recording', chatId);
    } catch {}

    const interval = setInterval(async () => {
        const currentState = readState(sock);
        if (!currentState.enabled) {
            clearInterval(interval);
            delete activeIntervals[key];
            return;
        }
        try {
            await sock.sendPresenceUpdate('recording', chatId);
        } catch {}
    }, 5000);

    activeIntervals[key] = interval;
}

module.exports = {
    autorecordingCommand,
    handleAutorecordingForMessage
};
