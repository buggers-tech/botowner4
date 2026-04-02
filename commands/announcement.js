const fs = require('fs');
const path = require('path');

/*
========================================
ANNOUNCEMENT COMMAND WITH MEDIA SUPPORT
(TEXT + IMAGE + VIDEO + WATERMARK)
========================================
*/

async function announcementCommand(sock, chatId, message) {
    try {
        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const context = message.message?.extendedTextMessage?.contextInfo || {};
        const quotedMessage = context.quotedMessage;

        let announcementText = rawText.replace(/\.announcement\s*/i, "").trim();

        if (!announcementText && !quotedMessage) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.announcement <message>\nOr reply to image/video/text with .announcement"
            });
            return;
        }

        // Extract text from reply if exists
        if (quotedMessage) {
            if (quotedMessage.conversation) {
                announcementText = quotedMessage.conversation;
            } else if (quotedMessage.extendedTextMessage?.text) {
                announcementText = quotedMessage.extendedTextMessage.text;
            }
        }

        // Keyword filter
        let keyword = null;
        const splitArgs = announcementText.split('|');
        if (splitArgs.length > 1) {
            announcementText = splitArgs[0].trim();
            keyword = splitArgs[1].trim().toLowerCase();
        }

        // =============================
        // 🔥 FINAL MESSAGE FORMAT
        // =============================
        const msgText = `📢📢⚠️💀 *BUGFIXED BROADCAST* 💀⚠️

╭━━━〔 ⚡ BUGBOT SIGNAL ⚡━━━⬣
┃ ${announcementText}
╰━━━━━━━━━━━━━━━━━━━━━━━⬣

★̷ ✦̷ ★̷ ✦̷ ★̷ ✦̷ ★̷ ✦̷

🔱 𝐁𝐔𝐆𝐁𝐎𝐓 𝐀𝐂𝐓𝐈𝐕𝐄 🔱

━━━━━━━━━━━━━━━━━━━━━━━
*SENT BY BUGFIXED SULEXH*
💧 BUGBOT XMD`;

        // =============================
        // 📥 DETECT MEDIA
        // =============================
        let media = null;
        let mediaType = null;

        if (quotedMessage?.imageMessage) {
            media = await sock.downloadMediaMessage({ message: quotedMessage });
            mediaType = "image";
        } else if (quotedMessage?.videoMessage) {
            media = await sock.downloadMediaMessage({ message: quotedMessage });
            mediaType = "video";
        }

        // =============================
        // 🚀 SEND TO GROUPS
        // =============================
        const chats = await sock.groupFetchAllParticipating();
        let sent = 0;

        for (const group of Object.values(chats)) {
            try {
                if (keyword && !group.subject.toLowerCase().includes(keyword)) continue;

                if (media && mediaType === "image") {
                    await sock.sendMessage(group.id, {
                        image: media,
                        caption: msgText
                    });
                } else if (media && mediaType === "video") {
                    await sock.sendMessage(group.id, {
                        video: media,
                        caption: msgText
                    });
                } else {
                    await sock.sendMessage(group.id, {
                        text: msgText
                    });
                }

                sent++;
                await new Promise(r => setTimeout(r, 500)); // anti-spam

            } catch (err) {
                console.warn(`⚠ Failed: ${group.subject}`, err.message);
                continue;
            }
        }

        await sock.sendMessage(chatId, {
            text: `✅ Sent to ${sent} group(s)`
        });

    } catch (err) {
        console.error("Announcement Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Announcement failed."
            });
        } catch {}
    }
}

module.exports = announcementCommand;
