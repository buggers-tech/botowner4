const fs = require('fs');
const path = require('path');

/*
========================================
DPDOWNLOAD COMMAND - Download Profile Picture
========================================
*/

async function dpdownloadCommand(sock, chatId, message) {
    try {
        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const phoneNumber = rawText.replace(/\.dpdownload\s*/i, "").trim();

        if (!phoneNumber) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.dpdownload 254xxxxxxxxx"
            });
            return;
        }

        // Format the JID
        const jid = phoneNumber + "@s.whatsapp.net";

        await sock.sendMessage(chatId, {
            text: "⏳ Downloading profile picture..."
        });

        try {
            // Get profile picture
            const pp = await sock.profilePictureUrl(jid, 'image');

            if (pp) {
                await sock.sendMessage(chatId, {
                    image: { url: pp },
                    caption: `📸 *Profile Picture*\n\n📞 Number: ${phoneNumber}\n⏰ Downloaded at: ${new Date().toLocaleString()}`
                });
            } else {
                await sock.sendMessage(chatId, {
                    text: "⚠ Could not download profile picture. User may not have one set."
                });
            }

        } catch (err) {
            console.error("Profile Picture Download Error:", err);
            await sock.sendMessage(chatId, {
                text: "⚠ Error downloading profile picture. Make sure the number is correct and has WhatsApp."
            });
        }

    } catch (err) {
        console.log("DPDownload Command Error:", err);
        try {
            await sock.sendMessage(chatId, {
                text: "⚠ DP Download error."
            });
        } catch {}
    }
}

module.exports = dpdownloadCommand;
