/**
 * GPT Context Reset Command
 * Clears conversation memory for the chat
 */

const chatContexts = require('./gpt'); // import the same context object from gpt.js

async function gptResetCommand(sock, chatId, message) {
  try {
    if (!chatContexts[chatId] || !chatContexts[chatId].length) {
      await sock.sendMessage(chatId, {
        text: "⚠ No GPT memory found to reset."
      });
      return;
    }

    chatContexts[chatId] = []; // reset conversation array

    await sock.sendMessage(chatId, {
      text: "✅ GPT memory for this chat has been reset successfully."
    });

  } catch (err) {
    console.error("GPT Reset Error:", err.message || err);
    try {
      await sock.sendMessage(chatId, {
        text: "❌ Failed to reset GPT memory."
      });
    } catch {}
  }
}

module.exports = gptResetCommand;
