// 🔴 ALWAYS OFFLINE COMMAND - Show only 1 tick

const fs = require('fs');

const CONFIG_FILE = './data/offline_config.json';

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch {}
    return { alwaysOffline: false };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function alwaysOfflineCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation || "";
        const [cmd, action] = rawText.trim().split(/\s+/);

        if (action === 'on') {
            let config = loadConfig();
            config.alwaysOffline = true;
            saveConfig(config);
            
            // Set presence to unavailable
            await sock.sendPresenceUpdate('unavailable', chatId);
            
            await sock.sendMessage(chatId, { 
                text: "✅ Always Offline activated!\n🔴 You will only show 1 tick (sent status only)" 
            });
        } else if (action === 'off') {
            let config = loadConfig();
            config.alwaysOffline = false;
            saveConfig(config);
            
            // Set presence to available
            await sock.sendPresenceUpdate('available', chatId);
            
            await sock.sendMessage(chatId, { text: "❌ Always Offline deactivated." });
        } else {
            const config = loadConfig();
            const status = config.alwaysOffline ? "✅ ON (Only 1 tick)" : "❌ OFF";
            await sock.sendMessage(chatId, { text: `Always Offline: ${status}` });
        }
    } catch (err) {
        console.error("Always Offline Error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Always Offline error." });
        } catch {}
    }
}

module.exports = alwaysOfflineCommand;
