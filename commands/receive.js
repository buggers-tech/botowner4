const axios = require("axios");

async function receiveCommand(sock, chatId, message, userMessage) {
    try {
        const args = userMessage.trim().split(/\s+/);

        // remove ".receive"
        args.shift();

        let amount;
        let phone;

        // ✅ default amount = 100
        if (args.length === 1) {
            amount = 100;
            phone = args[0];
        } else if (args.length >= 2) {
            amount = parseInt(args[0]);
            phone = args[1];
        } else {
            return sock.sendMessage(chatId, {
                text: "❌ Usage:\n.receive 100 2547xxxxxxx\nOR\n.receive 2547xxxxxxx"
            }, { quoted: message });
        }

        // ❌ validate amount
        if (isNaN(amount) || amount <= 0) {
            return sock.sendMessage(chatId, {
                text: "❌ Invalid amount"
            }, { quoted: message });
        }

        // clean phone
        phone = phone.replace(/[^0-9]/g, "").replace(/^0/, "254");

        if (phone.length !== 12) {
            return sock.sendMessage(chatId, {
                text: "❌ Invalid phone. Use 2547XXXXXXXX"
            }, { quoted: message });
        }

        // 🔥 send to backend
        let res = await axios.post("http://localhost:3000/pay", {
            amount,
            phone
        });

        if (res.data.success) {
            await sock.sendMessage(chatId, {
                text: `💰 *PAYMENT REQUEST SENT*

Amount: ${amount} KES
Number: ${phone}

📲 Check your phone and enter M-Pesa PIN`
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: "❌ Payment request failed"
            }, { quoted: message });
        }

    } catch (error) {
        console.error("Receive command error:", error);

        await sock.sendMessage(chatId, {
            text: "❌ Error sending payment request"
        }, { quoted: message });
    }
}

module.exports = receiveCommand;
