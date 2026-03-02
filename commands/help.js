const settings = require('../settings');
const axios = require('axios');

async function helpCommand(sock, chatId, message) {

try {

const startTime = Date.now();

// ===== BUGFIXED SAFE LOADER =====
await sock.sendMessage(chatId, {
text: "🧠 BUGBOT MODE ACTIVE...\n⚡ Loading Advanced AI Interface..."
}, { quoted: message });

// ===== META DATA =====
const videoURL = "https://files.catbox.moe/rxvkde.mp4";
const audioURL = "https://files.catbox.moe/yexeg9.mp3";

const runtime = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
const ping = Date.now() - startTime + "ms";

// ===== BUGFIXED MENU ENGINE =====
const helpMessage = `
╭════════════════════╮
👑 BUGBOT RUNNING ENGINE
────────────────────

🤖 Bot : ${settings.botName || "BUGBOT-XMD"}
⭐ Owner : ${settings.botOwner || "BUGFIXED TECH"}

⚡ Runtime : ${runtime}
📡 Ping : ${ping}
🌍 Version : ${settings.version || "3.0.7"}
╚═══════════════════╝

*Available Commands*

╔═══════════════════╗
🌐 *General Commands*
║ ➤ .help / .menu
║ ➤ .ping
║ ➤ .alive
║ ➤ .tts <text>
║ ➤ .owner
║ ➤ .joke
║ ➤ .quote
║ ➤ .fact
║ ➤ .weather <city>
║ ➤ .news
║ ➤ .attp <text>
║ ➤ .lyrics <song_title>
║ ➤ .8ball <question>
║ ➤ .groupinfo
║ ➤ .staff / .admins
║ ➤ .vv
║ ➤ .v
║ ➤ .trt <text> <lang>
║ ➤ .ss <link>
║ ➤ .jid
║ ➤ .url
║ ➤ .quran menu
╚═══════════════════╝

╔═══════════════════╗
👮‍♂️ *Admin Commands*
║ ➤ .ban @user
║ ➤ .promote @user
║ ➤ .demote @user
║ ➤ .mute <minutes>
║ ➤ .unmute
║ ➤ .delete / .del
║ ➤ .kick @user
║ ➤ .warnings @user
║ ➤ .warn @user
║ ➤ .antilink
║ ➤ .antibadword
║ ➤ .clear
║ ➤ .tag <message>
║ ➤ .tagall
║ ➤ .tagnotadmin
║ ➤ .hidetag <message>
║ ➤ .chatbot
║ ➤ .resetlink
║ ➤ .antitag <on/off>
║ ➤ .welcome <on/off>
║ ➤ .goodbye <on/off>
║ ➤ .setgdesc <description>
║ ➤ .setgname <new name>
║ ➤ .setgpp (reply to image)
╚═══════════════════╝

╔═══════════════════╗
🔒 *Owner Commands*
║ ➤ .mode <public/private>
║ ➤ .clearsession
║ ➤ .antidelete
║ ➤ .cleartmp
║ ➤ .update
║ ➤ .settings
║ ➤ .setpp <reply to image>
║ ➤ .autoreact <on/off>
║ ➤ .autostatus <on/off>
║ ➤ .autostatus react <on/off>
║ ➤ .autotyping <on/off>
║ ➤ .autorecording <on/off>
║ ➤ .alwaysonline <on/off>
║ ➤ .autoread <on/off>
║ ➤ .anticall <on/off>
║ ➤ .pmblocker <on/off/status>
║ ➤ .pmblocker setmsg <text>
║ ➤ .setmention <reply to msg>
║ ➤ .mention <on/off>
╚═══════════════════╝

╔═══════════════════╗
🤖 *Bugfixed Sulexh Commands*
║ ➤ .pair <number>
║ ➤ .user
║ ➤ .depair <number>
╚═══════════════════╝

╔═══════════════════╗
🎨 *Image/Sticker Commands*
║ ➤ .blur <image>
║ ➤ .simage <reply to sticker>
║ ➤ .sticker <reply to image>
║ ➤ .removebg
║ ➤ .remini
║ ➤ .crop <reply to image>
║ ➤ .tgsticker <link>
║ ➤ .meme
║ ➤ .take <packname>
║ ➤ .emojimix <emj1>+<emj2>
║ ➤ .igs <insta link>
║ ➤ .igsc <insta link>
╚═══════════════════╝

╔═══════════════════╗
📥 *Downloader*
║ ➤ .play <song_name>
║ ➤ .song <song_name>
║ ➤ .spotify <query>
║ ➤ .instagram <link>
║ ➤ .facebook <link>
║ ➤ .tiktok <link>
║ ➤ .video <song name>
║ ➤ .ytmp4 <Link>
╚═══════════════════╝
`;

// ===== SEND BUGBOT MENU =====
await sock.sendMessage(chatId, {
video: { url: videoURL },
caption: helpMessage,
gifPlayback: true,
footer: "👑 BUGFIXED SULEXH BUGBOT XMD",
buttons: [
{
buttonId: "https://chat.whatsapp.com/GyZBMUtrw9LIlV6htLvkCK?mode=gi_t",
buttonText: { displayText: "🔔 JOIN GROUP" },
type: 1
},
{
buttonId: "https://wa.me/254768161116",
buttonText: { displayText: "👑 CONTACT OWNER" },
type: 1
}
],
headerType: 4
},
{ quoted: message });

// ===== BACKGROUND AUDIO =====
const audio = await axios.get(
"https://files.catbox.moe/yexeg9.mp3",
{ responseType: "arraybuffer" }
);

await sock.sendMessage(chatId, {
audio: audio.data,
mimetype: "audio/mpeg",
ptt: false
});

} catch (error) {

console.error("BUGBOT MODE ERROR:", error);

await sock.sendMessage(chatId, {
text: "👑 BUGBOT MODE SAFE FALLBACK\nMenu loading failed."
});

}

}

module.exports = helpCommand;
