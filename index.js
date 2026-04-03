const settings = require('./settings')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const pino = require('pino')
const NodeCache = require('node-cache')
const express = require("express")
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidDecode, jidNormalizedUser } = require("@whiskeysockets/baileys")
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const PhoneNumber = require('awesome-phonenumber')
const { delay, smsg } = require('./lib/myfunc')
const store = require('./lib/lightweight_store')
store.readFromFile()

// ===== Express Web Server =====
const app = express()
const PORT = process.env.PORT || 3000
app.get("/", (_, res) => res.send("🚀 BUGBOT XMD is running"))
app.listen(PORT, () => console.log(`🌐 Web service listening on port ${PORT}`))

// ===== Multi-Number Bot Launcher =====
async function startBotForNumber(phoneNumberRaw, pairingCode = true) {
    try {
        const { version } = await fetchLatestBaileysVersion()

        // Clean number: digits only
        let phoneNumber = phoneNumberRaw.replace(/[^0-9]/g, '')
        if (!PhoneNumber('+' + phoneNumber).isValid()) {
            console.log(chalk.red(`Invalid number in settings: ${phoneNumberRaw}`))
            return
        }

        // Create session folder per number
        const sessionFolder = path.join('./session', phoneNumber)
        fs.mkdirSync(sessionFolder, { recursive: true })
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
        const msgRetryCounterCache = new NodeCache()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })) },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async key => store.loadMessage(jidNormalizedUser(key.remoteJid), key.id),
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 120000,
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 15000
        })

        sock.ev.on('creds.update', saveCreds)
        store.bind(sock)

        // ===== Connection Updates =====
        sock.ev.on('connection.update', async update => {
            const { connection, lastDisconnect, qr } = update

            if (qr) console.log(chalk.yellow(`📱 QR for ${phoneNumber} generated.`))
            if (connection === 'connecting') console.log(chalk.yellow(`🔄 ${phoneNumber} connecting...`))

            // WhatsApp confirmed connection
            if (connection === 'open') {
                console.log(chalk.green(`✅ ${phoneNumber} successfully connected to WhatsApp!`))
                console.log(chalk.green('WhatsApp Account Info:', sock.user))

                // Send autoplaying GIF (WebP) success message to bot account
                const userJid = sock.user.id
                const giftWebP = "https://files.catbox.moe/abcdef.webp" // <-- Replace with your WebP GIF URL

                const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

🚀 BOT IS NOW READY TO USE

💡 Type .menu to view commands

📢 Join WhatsApp Group:
https://chat.whatsapp.com/DG9XlePCVTEJclSejnZwN5?mode=gi_t

📞 Contact BUGBOT Owner: +254768161116
`

                try {
                    await sock.sendMessage(userJid, {
                        sticker: { url: giftWebP },
                        animated: true, // ensures GIF-like autoplay
                        caption: caption,
                        contextInfo: {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363416402842348@newsletter",
                                newsletterName: "BUGFIXED SULEXH TECH",
                                serverMessageId: 1
                            }
                        }
                    })
                    console.log(`🎉 ${phoneNumber} received success GIF message!`)
                } catch (e) {
                    console.error('Failed to send connection success GIF message:', e)
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(chalk.red(`❌ ${phoneNumber} logged out.`))
                } else {
                    console.log(chalk.yellow(`🔄 ${phoneNumber} reconnecting in 5s...`))
                    setTimeout(() => startBotForNumber(phoneNumberRaw, pairingCode), 5000)
                }
            }
        })

        // ===== Handle Pairing Code =====
        if (pairingCode && !sock.authState.creds.registered) {
            try {
                let code = await sock.requestPairingCode(phoneNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.bgGreen.black(`Pairing code for ${phoneNumber}: `), chalk.white(code))
            } catch (error) {
                console.error(`Failed to get pairing code for ${phoneNumber}:`, error)
            }
        }

        // ===== Messages Handler =====
        sock.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                if (mek.key?.remoteJid === 'status@broadcast') { await handleStatus(sock, chatUpdate); return }
                if (sock?.msgRetryCounterCache) sock.msgRetryCounterCache.clear()
                await handleMessages(sock, chatUpdate, true)
            } catch (err) { console.error("Error in messages.upsert:", err) }
        })

        // ===== Contacts =====
        sock.decodeJid = jid => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {}
                return decode.user && decode.server ? decode.user + '@' + decode.server : jid
            }
            return jid
        }

        sock.ev.on('contacts.update', update => {
            for (let contact of update) {
                const id = sock.decodeJid(contact.id)
                store.contacts[id] = { id, name: contact.notify }
            }
        })

        sock.getName = (jid, withoutContact = false) => {
            const id = sock.decodeJid(jid)
            const v = store.contacts[id] || { id, name: PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international') }
            return withoutContact ? '' : v.name
        }

        sock.public = true
        sock.serializeM = m => smsg(sock, m, store)

        return sock

    } catch (err) {
        console.error(`Bot start error for ${phoneNumberRaw}:`, err)
        await delay(5000)
        startBotForNumber(phoneNumberRaw, pairingCode)
    }
}

// ===== Launch All Numbers from settings.js =====
async function startMultiBotFromSettings() {
    if (!Array.isArray(settings.numbers) || settings.numbers.length === 0) {
        console.log(chalk.red("No numbers defined in settings.js!"))
        process.exit(1)
    }

    console.log(chalk.blue(`Starting bots for: ${settings.numbers.join(', ')}`))
    for (let num of settings.numbers) {
        startBotForNumber(num, true)
    }
}

// ===== Start =====
startMultiBotFromSettings()
process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)
