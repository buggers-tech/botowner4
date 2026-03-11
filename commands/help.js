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
const imageURL = "https://imgur.com/gallery/bugbot-xmd-ukCJhwl";

const runtime = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
const ping = Date.now() - startTime + "ms";

// ===== BUGFIXED MENU ENGINE =====
const helpMessage = `
╭════════════════════╮
👑 BUGBOT RUNNING ENGINE
────────────────────
╭───〔 🤖 ${settings.botName || "BUGBOT"} 〕───⬣
│ 👤 User : ${message.pushName || "User"}
│ ⚡ Mode : ${settings.mode || "Public"}
│ ⏱ Uptime : ${process.uptime().toFixed(0)}s
╰──────────────────────
╭───────────────────
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇GENERAL◇⭐
│──────────────
│ .help
│ .menu
│ .alive
│ .ping
│ .owner
│ .fact
│ .joke
│ .quote
│ .weather <city>
│ .news
│ .tts <text>
│ .attp <text>
│ .lyrics <song>
│ .8ball <question>
│ .groupinfo
│ .staff
│ .admins
│ .vv
│ .v
│ .trt <text> <lang>
│ .ss <link>
│ .jid
│ .url
│ .quran menu
│ .bugmenu(hidden only for premium users)
╰────────────────────⬣
╭────────────────────⬣
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇ADMIN◇⭐
│──────────────
│ .ban @user
│ .promote @user
│ .demote @user
│ .mute <minutes>
│ .unmute
│ .delete
│ .del
│ .kick @user
│ .warnings @user
│ .warn @user
│ .antilink
│ .antibadword
│ .clear
│ .tag <message>
│ .tagall
│ .tagnotadmin
│ .hidetag <message>
│ .chatbot
│ .resetlink
│ .antitag on/off
│ .welcome on/off
│ .goodbye on/off
│ .setgdesc
│ .setgname
│ .setgpp
╰────────────────────⬣
╭────────────────────⬣
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇OWNER◇⭐
│──────────────
│ .mode public
│ .mode private
│ .clearsession
│ .antidelete
│ .cleartmp
│ .update
│ .settings
│ .setpp
│ .autoreact
│ .autostatus
│ .autostatus react
│ .autotyping
│ .autorecording
│ .alwaysonline
│ .autoread
│ .anticall
│ .pmblocker
│ .pmblocker setmsg
│ .setmention
│ .mention
╰────────────────────⬣
╭────────────────────⬣
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇BUGFIXED◇⭐
│──────────────
│ .pair <number>
│ .user
│ .depair <number>
╰────────────────────⬣
╭────────────────────⬣
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇IMAGE LAB◇⭐
│──────────────
│ .sticker
│ .simage
│ .blur
│ .removebg
│ .remini
│ .crop
│ .meme
│ .take <packname>
│ .emojimix
│ .tgsticker
│ .igs
│ .igsc
╰────────────────────⬣
╭────────────────────⬣
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇DOWNLOAD◇⭐
│──────────────
│ .play <song>
│ .song <song>
│ .spotify
│ .instagram
│ .facebook
│ .tiktok
│ .video
│ .ytmp4
│ .mediafire
│ .apk
╰────────────────────⬣
─────────────────────⬣
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
│
│ ⭐◇FUN◇⭐
│──────────────
│ .truth
│ .dare
│ .riddle
│ .rate
│ .ship
│ .fact
│ .quote
╰────────────────────⬣
`;

// ===== SEND BUGBOT MENU =====
await sock.sendMessage(chatId, {
image: { url: imageURL },
caption: helpMessage,
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


} catch (error) {

console.error("BUGBOT MODE ERROR:", error);

await sock.sendMessage(chatId, {
text: "👑 BUGBOT MODE SAFE FALLBACK\nMenu loading failed."
});

}

}

module.exports = helpCommand;
