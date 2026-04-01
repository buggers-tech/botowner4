const fs = require('fs');
const path = require('path');

let antieditActiveChats = new Set(); // Tracks which chats have antiedit ON

/*
========================================
GET FILE PATH PER BOT
========================================
*/
function getDataFile(sock) {
    if (!sock?.user?.id) return null;

    const botNumber = sock.user.id.split(":")[0];
    const dir = path.join(__dirname, '../data/antiedit');

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return path.join(dir, `${botNumber}.json`);
}

/*
========================================
READ EDITS
========================================
*/
function readEdits(sock) {
    const file = getDataFile(sock);
    if (!file) return [];

    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        return [];
    }
}

/*
========================================
WRITE EDITS
========================================
*/
function writeEdits(sock, edits) {
    const file = getDataFile(sock);
    if (!file) return;

    fs.writeFileSync(file, JSON.stringify(edits, null, 2));
}

/*
========================================
COMMAND TO TOGGLE ANTIEDIT
========================================
*/
async function antieditCommand(sock, chatId, message) {
    try {
        if (antieditActiveChats.has(chatId)) {
            antieditActiveChats.delete(chatId);
            await sock.sendMessage(chatId, { text: "❌ Antiedit disabled for this chat." });
        } else {
            antieditActiveChats.add(chatId);
            await sock.sendMessage(chatId, { text: "✅ Antiedit enabled. I will now detect edited messages." });
        }
    } catch (err) {
        console.log("Antiedit Command Error:", err);
        try {
            await sock.sendMessage(chatId, { text: "⚠ Antiedit command error." });
        } catch {}
    }
}

/*
========================================
TRACK AND DISPLAY EDITED MESSAGES
========================================
*/
async function trackEditedMessage(sock, message, beforeText, afterText) {
    try {
        const chatId = message.key?.remoteJid;
        if (!antieditActiveChats.has(chatId)) return; // Only show if antiedit is ON for this chat

        // Save edits
        let edits = readEdits(sock);
        edits.push({
            sender: message.key?.participant || message.key?.remoteJid,
            before: beforeText,
            after: afterText,
            timestamp: new Date().toISOString()
        });
        if (edits.length > 100) edits = edits.slice(-100);
        writeEdits(sock, edits);

        // Send the edited message info
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

module.exports = {
    antieditCommand,
    trackEditedMessage
};
