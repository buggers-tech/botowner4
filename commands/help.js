const { generateWAMessageFromContent } = require("@whiskeysockets/baileys")

async function helpCommand(sock, chatId, message) {

const banner = "https://files.catbox.moe/ip70j9.jpg"

// GENERAL
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

// ADMIN
const ADMIN = `
╭────────────────────⬣
│ ⭐◇ADMIN COMMANDS◇⭐
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
│ .tag
│ .tagall
│ .tagnotadmin
│ .hidetag
│ .chatbot
│ .resetlink
│ .antitag
│ .welcome
│ .goodbye
│ .setgdesc
│ .setgname
│ .setgpp
╰────────────────────⬣
`

// OWNER
const OWNER = `
╭────────────────────⬣
│ ⭐◇OWNER COMMANDS◇⭐
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

// BUGFIXED
const BUG = `
╭────────────────────⬣
│ ⭐◇BUGFIXED SULEXH◇⭐
│──────────────
│ .pair <number>
│ .user
│ .depair <number>
╰────────────────────⬣
`

// IMAGE
const IMAGE = `
╭────────────────────⬣
│ ⭐◇IMAGE & STICKER LAB◇⭐
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

// DOWNLOAD
const DOWNLOAD = `
╭────────────────────⬣
│ ⭐◇DOWNLOADERS◇⭐
│──────────────
│ .play
│ .song
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

// FUN
const FUN = `
╭────────────────────⬣
│ ⭐◇FUN GAME ZONE◇⭐
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

// PREMIUM
const PREMIUM = `
╭────────────────────⬣
│ ⭐◇PREMIUM / SECRET◇⭐
│──────────────
│ BUG MENU
│ Flood Protection
│ Hidden BUG Engine ON
╰────────────────────⬣
`

const sections = [
{title:"⭐ GENERAL", text:GENERAL},
{title:"⭐ ADMIN", text:ADMIN},
{title:"⭐ OWNER", text:OWNER},
{title:"⭐ BUGFIXED", text:BUG},
{title:"⭐ IMAGE LAB", text:IMAGE},
{title:"⭐ DOWNLOAD", text:DOWNLOAD},
{title:"⭐ FUN", text:FUN},
{title:"⭐ PREMIUM", text:PREMIUM}
]

const cards = sections.map(sec => ({
header:{
title:sec.title,
imageMessage:{url:banner},
hasMediaAttachment:true
},
body:{text:sec.text},
footer:{text:"Powered by Team-Bandhaeali"},
buttons:[]
}))

const msg = generateWAMessageFromContent(chatId,{
viewOnceMessage:{
message:{
interactiveMessage:{
body:{text:"⭐ SMD-MINI MENU ⭐"},
carouselMessage:{cards}
}
}
}
},{userJid:sock.user.id})

await sock.relayMessage(chatId,msg.message,{messageId:msg.key.id})

}

module.exports = helpCommand
