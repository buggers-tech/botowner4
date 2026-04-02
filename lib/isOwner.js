/**
 * GLOBAL OWNER + SUDO CHECK
 * Owner is strictly defined
 */

const { isSudo } = require('./index');

const OWNER_NUMBER = "254768161116";

async function isOwnerOrSudo(senderId) {
    try {
        if (!senderId) return false;

        const cleanSender = senderId
            .split(':')[0]
            .split('@')[0];

        // ✅ OWNER CHECK (priority)
        if (cleanSender === OWNER_NUMBER) {
            return true;
        }

        // ✅ SUDO CHECK
        try {
            return await isSudo(senderId);
        } catch {
            return false;
        }

    } catch (err) {
        console.error("❌ [isOwnerOrSudo] Error:", err);
        return false;
    }
}

module.exports = isOwnerOrSudo;
