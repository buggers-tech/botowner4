const settings = require('../settings')
const axios = require("axios")

const { prepareWAMessageMedia } = require("@whiskeysockets/baileys")

async function helpCommand(sock, chatId, message) {

try {

const banners = [
"https://files.catbox.moe/ip70j9.jpg"
]

const banner = banners[Math.floor(Math.random()*banners.length)]

// preload image once
const { data } = await axios.get(banner,{responseType:"arraybuffer"})

const media = await prepareWAMessageMedia(
{ image: { url: banner } },
{ upload: sock.waUploadToServer }
)


// ================= GENERAL =================
const GENERAL = `
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
`

// ================= ADMIN =================
const ADMIN = `
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
`

// ================= OWNER =================
const OWNER = `
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
`

// ================= BUG =================
const BUG = `
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
`

// ================= IMAGE =================
const IMAGE = `
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
`

// ================= DOWNLOAD =================
const DOWNLOAD = `
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
`

// ================= FUN =================
const FUN = `
╭────────────────────⬣
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
`

const sections = [
{title:"⭐ GENERAL",text:GENERAL},
{title:"⭐ ADMIN",text:ADMIN},
{title:"⭐ OWNER",text:OWNER},
{title:"⭐ BUGFIXED",text:BUG},
{title:"⭐ IMAGE LAB",text:IMAGE},
{title:"⭐ DOWNLOAD",text:DOWNLOAD},
{title:"⭐ FUN",text:FUN}
]

const cards = sections.map(sec => ({
header:{
title:sec.title,
hasMediaAttachment:true,
imageMessage:media.imageMessage
},
body:{text:sec.text},
footer:{text:settings.botName || "BUGBOT"},
buttons:[]
}))

await sock.sendMessage(chatId,{
viewOnceMessage:{
message:{
interactiveMessage:{
body:{
text:`
╭───〔 🤖 ${settings.botName || "BUGBOT"} 〕───⬣
│ 👤 User : ${message.pushName || "User"}
│ ⚡ Mode : ${settings.mode || "Public"}
│ ⏱ Uptime : ${process.uptime().toFixed(0)}s
╰────────────────────⬣
Swipe cards to explore commands →
`
},
carouselMessage:{cards}
}
}
}
},{quoted:message})

}catch(err){

console.error("MENU ERROR:",err)

await sock.sendMessage(chatId,{
text:"Menu failed to load."
},{quoted:message})

}

}

module.exports = helpCommand
