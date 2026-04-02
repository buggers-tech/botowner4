const fs = require('fs');
const path = require('path');

// Tracks which chats have antiedit ON in memory
let antieditActiveChats = new Set();

/**
 * Get file path for this bot
 */
function getDataFile(sock) {
    if (!sock?.user?.id) return null;

    const botNumber = sock.user.id.split(":")[0]; // dynamic bot number
    const dir = path.join(__dirname, '../data/antiedit');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, `${botNumber}.json`);
}

/**
 * Load persisted antiedit chat list
 */
function loadAntiedit(sock) {
    const file = getDataFile(sock);
    if (!file) return [];

    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        antieditActiveChats = new Set(data);
    } catch {
        antieditActiveChats = new Set();
    }
}

/**
 * Save antiedit chat list
 */
function saveAntiedit(sock) {
    const file = getDataFile(sock);
    if (!file) return;

    try {
        fs.writeFileSync(file, JSON.stringify([...antieditActiveChats], null, 2));
    } catch (err) {
        console.error("Failed to save antiedit chats:", err);
    }
}

/**
 * Toggle Antiedit for a chat
 */
async function antieditCommand(sock, chatId) {
    try {
        if (antieditActiveChats.has(chatId)) {
            antieditActiveChats.delete(chatId);
            await sock.sendMessage(chatId, { text: "❌ Antiedit disabled for this chat." });
        } else {
            antieditActiveChats.add(chatId);
            await sock.sendMessage(chatId, { text: "✅ Antiedit enabled. I will now detect edited messages." });
        }

        saveAntiedit(sock); // persist changes
    } catch (err) {
        console.log("Antiedit Command Error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Antiedit command error." });
        } catch {}
    }
}

/**
 * Track edited messages
 */
async function trackEditedMessage(sock, message, beforeText, afterText) {
    try {
        const chatId = message.key?.remoteJid;
        if (!antieditActiveChats.has(chatId)) return;

        let edits = [];
        const file = getDataFile(sock);
        if (file && fs.existsSync(file)) {
            try { edits = JSON.parse(fs.readFileSync(file, 'utf-8')) || []; } catch {}
        }

        edits.push({
            sender: message.key?.participant || chatId,
            before: beforeText,
            after: afterText,
            timestamp: new Date().toISOString()
        });

        if (edits.length > 100) edits = edits.slice(-100);
        if (file) fs.writeFileSync(file, JSON.stringify(edits, null, 2));

        let text = `✏️ *Edited Message Detected*\n\n`;
        text += `*From:* ${message.key?.participant || "Unknown"}\n`;
        text += `*Before:* ${beforeText}\n`;
        text += `*After:* ${afterText}\n`;
        text += `*Time:* ${new Date().toLocaleTimeString()}`;

        await sock.sendMessage(chatId, { text });

    } catch (err) {
        console.error("Error tracking edited message:", err);
    }
}

/**
 * Call this on bot startup to restore previous antiedit states
 */
function restoreAntiedit(sock) {
    loadAntiedit(sock);
}

module.exports = {
    antieditCommand,
    trackEditedMessage,
    restoreAntiedit
};
