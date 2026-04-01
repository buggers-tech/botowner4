const fs = require('fs');
const path = require('path');

/*
========================================
ANNOUNCEMENT COMMAND WITH SELECTIVE GROUP OPTION
========================================
*/

async function announcementCommand(sock, chatId, message) {
    try {
        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        // Check if replying to a message
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        let announcementText = rawText.replace(/\.announcement\s*/i, "").trim();

        if (!announcementText && !quotedMessage) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.announcement <message> [keyword]\nOr reply to a message with .announcement"
            });
            return;
        }

        if (quotedMessage) {
            if (quotedMessage.conversation) {
                announcementText = quotedMessage.conversation;
            } else if (quotedMessage.extendedTextMessage?.text) {
                announcementText = quotedMessage.extendedTextMessage.text;
            }
        }

        // Optional keyword to filter groups
        let keyword = null;
        const splitArgs = announcementText.split('|'); // e.g., ".announcement Hello everyone | study"
        if (splitArgs.length > 1) {
            announcementText = splitArgs[0].trim();
            keyword = splitArgs[1].trim().toLowerCase();
        }

        // Fetch all groups
        const chats = await sock.groupFetchAllParticipating();
        let groupCount = 0;

        for (const group of Object.values(chats)) {
            try {
                // If keyword is provided, only send to matching groups
                if (keyword && !group.subject.toLowerCase().includes(keyword)) continue;

                const msg = `📢 *ANNOUNCEMENT*\n\n${announcementText}\n\n *SENT BY BUGFIXED SULEXH* `;
                await sock.sendMessage(group.id, { text: msg });
                groupCount++;
                await new Promise(r => setTimeout(r, 500)); // prevent rate-limit
            } catch (err) {
                console.warn(`⚠ Could not send announcement to ${group.subject} (${group.id}), skipping. Error:`, err.message);
                continue;
            }
        }

        await sock.sendMessage(chatId, {
            text: `✅ Announcement attempted in ${Object.keys(chats).length} groups, successfully sent to ${groupCount} group(s).`
        });

    } catch (err) {
        console.error("Announcement Command Error:", err);
        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Announcement error."
            });
        } catch {}
    }
}

module.exports = announcementCommand;
