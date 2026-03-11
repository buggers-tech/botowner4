const settings = require('../settings')
const axios = require('axios')

async function helpCommand(sock, chatId, message) {
try {

const banner = "https://i.imgur.com/MJIZMZT.jpg"

// download banner
const { data } = await axios.get(banner,{ responseType:"arraybuffer"})
const buffer = Buffer.from(data)

// FULL MENU
const MENU = `
╭───〔 🤖 ${settings.botName || "BUGBOT"} 〕───⬣
│ 👤 User : ${message.pushName || "User"}
│ ⚡ Mode : ${settings.mode || "Public"}
│ ⏱ Uptime : ${process.uptime().toFixed(0)}s
╰────────────────────⬣

╭────────────────────⬣
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
│ .bugmenu
╰────────────────────⬣

╭────────────────────⬣
│ ⭐◇ADMIN◇⭐
│──────────────
│ .ban @user
│ .promote @user
│ .demote @user
│ .mute <minutes>
│ .unmute
│ .delete
│ .kick @user
│ .warn @user
│ .tagall
│ .hidetag
│ .welcome on/off
│ .goodbye on/off
╰────────────────────⬣

╭────────────────────⬣
│ ⭐◇OWNER◇⭐
│──────────────
│ .mode public
│ .mode private
│ .clearsession
│ .update
│ .autoreact
│ .autostatus
│ .autotyping
│ .autorecording
│ .alwaysonline
│ .anticall
│ .pmblocker
╰────────────────────⬣
`

await sock.sendMessage(chatId,{
image: buffer,
caption: MENU
},{quoted:message})

}catch(err){

console.log("MENU ERROR:",err)

await sock.sendMessage(chatId,{
text:"Menu failed to load."
},{quoted:message})

}
}

module.exports = helpCommand
