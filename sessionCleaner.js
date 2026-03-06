const fs = require("fs");
const path = require("path");

const SESSION_DIR = "./session";

function cleanOldSessions() {

    const now = Date.now();

    fs.readdirSync(SESSION_DIR).forEach(folder => {

        const fullPath = path.join(SESSION_DIR, folder);
        const stats = fs.statSync(fullPath);

        const age = now - stats.mtimeMs;

        // DELETE SESSION AFTER 3 DAYS INACTIVE
        if (age > 3 * 24 * 60 * 60 * 1000) {

            fs.rmSync(fullPath, { recursive: true, force: true });

            console.log("🧹 Deleted inactive session:", folder);
        }

    });
}

setInterval(cleanOldSessions, 6 * 60 * 60 * 1000); // every 6 hours

module.exports = cleanOldSessions;
