/**
 * OWNER + SUDO CHECK UTILITY
 * Supports:
 * 1️⃣ Strict owner-only check
 * 2️⃣ Owner + sudo check
 */

const { isSudo } = require('./index');

// Set your global owner number here
const OWNER_NUMBER = "254768161116";

/**
 * Strict owner-only check
 * @param {string} senderId
 * @returns {boolean}
 */
function isStrictOwner(senderId) {
    if (!senderId) return false;
    const cleanSender = senderId.split(':')[0].split('@')[0];
    return cleanSender === OWNER_NUMBER;
}

/**
 * Owner + sudo check
 * @param {string} senderId
 * @returns {Promise<boolean>}
 */
async function isOwnerOrSudo(senderId) {
    try {
        if (!senderId) return false;

        const cleanSender = senderId.split(':')[0].split('@')[0];

        // ✅ Strict owner check first
        if (cleanSender === OWNER_NUMBER) return true;

        // ✅ Fallback to sudo check
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

module.exports = {
    OWNER_NUMBER,
    isStrictOwner,
    isOwnerOrSudo
};
