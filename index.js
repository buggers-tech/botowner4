require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const express = require("express")

// Web service for Render
const app = express()
const PORT = process.env.PORT || 3000
app.get("/", (_, res) => res.send("🚀 BUGBOT XMD is running"))
app.listen(PORT, () => console.log(`🌐 Web service listening on port ${PORT}`))

// Import lightweight store
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization
setInterval(() => { if (global.gc) global.gc() }, 60_000)
setInterval(() => { console.log(`📊 RAM Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`) }, 60_000)

let phoneNumber = "254768161116"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "BUGBOT XMD"
global.themeemoji = "•"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = text => rl ? new Promise(resolve => rl.question(text, resolve)) : Promise.resolve(settings.ownerNumber || phoneNumber)

async function startXeonBotInc() {
    try {
        let { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })) },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async key => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 15000
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // ================ MESSAGES =================
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                if (mek.key?.remoteJid === 'status@broadcast') { await handleStatus(XeonBotInc, chatUpdate); return }

                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify' && !mek.key.remoteJid?.endsWith('@g.us')) return
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
                if (XeonBotInc?.msgRetryCounterCache) XeonBotInc.msgRetryCounterCache.clear()

                await handleMessages(XeonBotInc, chatUpdate, true)

            } catch (err) { console.error("Error in messages.upsert:", err) }
        })

        // ================ DECODING & CONTACTS =================
        XeonBotInc.decodeJid = jid => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server ? decode.user + '@' + decode.server : jid
            } else return jid
        }

        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        XeonBotInc.getName = (jid, withoutContact = false) => {
            let id = XeonBotInc.decodeJid(jid)
            withoutContact = XeonBotInc.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async resolve => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ? XeonBotInc.user : store.contacts[id] || {}
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        XeonBotInc.public = true
        XeonBotInc.serializeM = m => smsg(XeonBotInc, m, store)

        // ================ PAIRING CODE =================
        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api')
            let phoneNumber = global.phoneNumber || await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFormat: 6281376552730 : `)))
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
            if (!PhoneNumber('+' + phoneNumber).isValid()) { console.log(chalk.red('Invalid phone number')); process.exit(1) }

            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(phoneNumber)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log(chalk.bgGreen.black(`Your Pairing Code: `), chalk.white(code))
                } catch (error) { console.error('Failed to get pairing code:', error) }
            }, 3000)
        }

        // ================ CONNECTION =================
        XeonBotInc.ev.on('connection.update', async s => {
            const { connection, lastDisconnect, qr } = s
            if (qr) console.log(chalk.yellow('📱 QR Code generated'))
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting...'))
            if (connection === 'open') console.log(chalk.green('✅ Connected'))

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut
                if (!shouldReconnect) return console.log('❌ Logged out')
                console.log('🔄 Reconnecting in 5s...')
                setTimeout(() => startXeonBotInc(), 5000)
            }
        })

        // ================ ANTICALL =================
        const antiCallNotified = new Set()
        XeonBotInc.ev.on('call', async calls => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall')
                const state = readAnticallState()
                if (!state.enabled) return
                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId
                    if (!callerJid) continue
                    try { if (XeonBotInc.rejectCall && call.id) await XeonBotInc.rejectCall(call.id, callerJid) } catch {}
                    if (!antiCallNotified.has(callerJid)) {
                        antiCallNotified.add(callerJid)
                        setTimeout(() => antiCallNotified.delete(callerJid), 60000)
                        await XeonBotInc.sendMessage(callerJid, { text: '📵 Anticall is enabled.' })
                    }
                    setTimeout(async () => { try { await XeonBotInc.updateBlockStatus(callerJid, 'block') } catch {} }, 800)
                }
            } catch {}
        })

        // ================ GROUP & STATUS HANDLERS =================
        XeonBotInc.ev.on('group-participants.update', update => handleGroupParticipantUpdate(XeonBotInc, update))
        XeonBotInc.ev.on('messages.upsert', m => m.messages[0].key.remoteJid === 'status@broadcast' && handleStatus(XeonBotInc, m))
        XeonBotInc.ev.on('status.update', status => handleStatus(XeonBotInc, status))
        XeonBotInc.ev.on('messages.reaction', status => handleStatus(XeonBotInc, status))

        return XeonBotInc

    } catch (error) { console.error('Bot start error:', error); await delay(5000); startXeonBotInc() }
}

// ================ START BOT =================
startXeonBotInc()
process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

let file = require.resolve(__filename)
fs.watchFile(file, () => { fs.unwatchFile(file); delete require.cache[file]; require(file) })
