const fs = require('fs');
const path = require('path');

/**
 * Get bot number dynamically
 */
function getBotNumber(sock) {
    return sock.user?.id?.split(':')[0] || 'unknown';
}

/**
 * Get config file path for this bot number
 */
function getConfigFile(sock) {
    const botNumber = getBotNumber(sock);
    const folder = path.join('./data/alwaysoffline');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    return path.join(folder, `${botNumber}.json`);
}

/**
 * Load Always Offline config
 */
function loadConfig(sock) {
    const CONFIG_FILE = getConfigFile(sock);
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (err) {
        console.error("Load AlwaysOffline config error:", err);
    }
    return { alwaysOffline: false };
}

/**
 * Save Always Offline config
 */
function saveConfig(sock, config) {
    const CONFIG_FILE = getConfigFile(sock);
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error("Save AlwaysOffline config error:", err);
    }
}

/**
 * Check if Always Offline is enabled
 */
function isAlwaysOfflineEnabled(sock) {
    const config = loadConfig(sock);
    return config.alwaysOffline || false;
}

/**
 * Toggle Always Offline via command (no restriction)
 */
async function alwaysOfflineCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const [cmd, action] = rawText.trim().split(/\s+/);

        const config = loadConfig(sock);

        if (action === 'on') {
            config.alwaysOffline = true;
            saveConfig(sock, config);

            await sock.sendPresenceUpdate('unavailable', chatId);

            await sock.sendMessage(chatId, {
                text: "✅ Always Offline activated!\n🔴 You will only show 1 tick (sent status only)"
            });

        } else if (action === 'off') {
            config.alwaysOffline = false;
            saveConfig(sock, config);

            await sock.sendPresenceUpdate('available', chatId);

            await sock.sendMessage(chatId, {
                text: "❌ Always Offline deactivated."
            });

        } else {
            const status = config.alwaysOffline ? "✅ ON (Only 1 tick)" : "❌ OFF";
            await sock.sendMessage(chatId, { text: `Always Offline Status: ${status}` });
        }

    } catch (err) {
        console.error("Always Offline Command Error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Always Offline error." });
        } catch {}
    }
}

/**
 * Intercept messages to prevent double-tick if Always Offline is active
 * Still allows the bot to process/read messages internally
 */
async function handleAlwaysOffline(sock, message) {
    try {
        if (!isAlwaysOfflineEnabled(sock)) return;

        // Don't modify your own messages
        if (message.key?.fromMe) return;

        // Intercept and suppress read receipts
        if (sock.sendReadReceipt) {
            sock.sendReadReceipt = async () => {}; // override default behavior
        }

        // Intercept presence updates to show only 1 tick
        if (sock.sendPresenceUpdate) {
            sock.sendPresenceUpdate = async () => {}; // prevents automatic online presence updates
        }

        // Messages can still be read internally
        return message;

    } catch (err) {
        console.error("AlwaysOffline handler error:", err);
    }
}

/**
 * Apply Always Offline on bot startup
 */
async function restoreAlwaysOffline(sock) {
    try {
        if (isAlwaysOfflineEnabled(sock)) {
            await sock.sendPresenceUpdate('unavailable');
            console.log("🔴 Always Offline restored on startup (1 tick mode).");
        }
    } catch (err) {
        console.error("Failed to restore Always Offline on startup:", err);
    }
}

module.exports = {
    alwaysOfflineCommand,
    isAlwaysOfflineEnabled,
    handleAlwaysOffline,
    restoreAlwaysOffline
};
