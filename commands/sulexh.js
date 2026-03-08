const { channelInfo } = require('../lib/messageConfig');

/**
 * Enhanced SULEXH Command with Anti-Disconnect Protection
 * Sends 7000 messages with intelligent throttling and socket keep-alive
 * Prevents socket disconnection and maintains bot stability
 */
async function sulexhCommand(sock, chatId, message) {
    try {
        console.log("🚀 SULEXH FLOOD COMMAND INITIATED - Preparing 7000 messages");

        // Validate socket connection before starting
        if (!sock || !sock.ws || !sock.ws.socket || sock.ws.socket.readyState !== 1) {
            throw new Error("Socket connection not ready for message flood");
        }

        // CRITICAL: Enhanced configuration with proper throttling to prevent socket death
        const TOTAL_MESSAGES = 7000;
        const BATCH_SIZE = 25; // REDUCED from 50 to prevent overwhelming the socket
        const BATCH_DELAY = 500; // INCREASED from 10ms to 500ms - this is critical!
        const RETRY_ATTEMPTS = 1; // Reduced from 2 to avoid re-attempts that stress socket
        const HEARTBEAT_INTERVAL = 5000; // Send ping every 5 seconds to keep socket alive
        
        let successfulMessages = 0;
        let failedMessages = 0;
        let totalBatches = Math.ceil(TOTAL_MESSAGES / BATCH_SIZE);
        let floodAborted = false;

        console.log(`📊 Flood Configuration:
        - Total Messages: ${TOTAL_MESSAGES}
        - Batch Size: ${BATCH_SIZE}
        - Total Batches: ${totalBatches}
        - Batch Delay: ${BATCH_DELAY}ms (CRITICAL for socket stability)
        - Heartbeat: Every ${HEARTBEAT_INTERVAL}ms
        - Anti-Disconnect: ENABLED`);

        const startTime = Date.now();

        // Send initial confirmation to avoid confusion
        await sock.sendMessage(chatId, {
            text: `🚀 INITIATING SULEXH MEGA FLOOD\n` +
                  `📊 Target: ${TOTAL_MESSAGES} messages\n` +
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
                failedMessages += (TOTAL_MESSAGES - (batchIndex * BATCH_SIZE));
                break;
            }

            const batchStart = batchIndex * BATCH_SIZE;
            const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_MESSAGES);
            const batchMessages = [];

            console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (Messages ${batchStart + 1}-${batchEnd})`);

            // Create batch of message promises with sequential timing
            for (let i = batchStart; i < batchEnd; i++) {
                const messagePromise = sendFloodMessage(sock, chatId, i + 1, RETRY_ATTEMPTS);
                batchMessages.push(messagePromise);
            }

            // Execute batch with error handling
            try {
                const batchResults = await Promise.allSettled(batchMessages);
                
                // Process batch results
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value.success) {
                        successfulMessages++;
                    } else {
                        failedMessages++;
                        console.log(`❌ Message ${batchStart + index + 1} failed:`, 
                                  result.reason?.message || result.value?.error || 'Unknown error');
                    }
                });

                // CRITICAL: Delay between batches - DO NOT REDUCE THIS!
                // This prevents WhatsApp rate limiting and socket overflow
                if (batchIndex < totalBatches - 1) {
                    console.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }

                // Progress update every 10 batches to avoid log spam
                if ((batchIndex + 1) % 10 === 0) {
                    const elapsed = Date.now() - startTime;
                    const rate = (successfulMessages / (elapsed / 1000)).toFixed(2);
                    console.log(`📊 Progress: ${batchIndex + 1}/${totalBatches} batches | Rate: ${rate} msg/s`);
                }

            } catch (batchError) {
                console.error(`💥 Batch ${batchIndex + 1} critical error:`, batchError.message);
                failedMessages += batchMessages.length;
                
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
        const messagesPerSecond = (successfulMessages / (totalTime / 1000)).toFixed(2);

        console.log(`🎯 SULEXH FLOOD COMPLETED:
        - Successful: ${successfulMessages}/${TOTAL_MESSAGES}
        - Failed: ${failedMessages}/${TOTAL_MESSAGES}
        - Aborted: ${floodAborted ? 'YES' : 'NO'}
        - Duration: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)
        - Speed: ${messagesPerSecond} msg/sec
        - Heartbeats: ${heartbeatCounter}`);

        // Send detailed completion report
        const completionReport = `
💥💥💥 SULEXH MEGA FLOOD COMPLETED! 💥💥💥

📊 DETAILED STATISTICS:
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Successful: ${successfulMessages}/${TOTAL_MESSAGES}
┃ ❌ Failed: ${failedMessages}/${TOTAL_MESSAGES}
┃ 📈 Success Rate: ${((successfulMessages/TOTAL_MESSAGES)*100).toFixed(1)}%
┃ ⏱️ Total Duration: ${(totalTime/1000).toFixed(2)} seconds
┃ ⚡ Speed: ${messagesPerSecond} messages/second
┃ 📦 Batches Processed: ${totalBatches}
┃ 💓 Keep-Alive Pings: ${heartbeatCounter}
┃ 🛑 Aborted: ${floodAborted ? 'YES ⚠️' : 'NO ✅'}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 EXECUTION MODE: Enhanced Anti-Disconnect with Keep-Alive
🛡️ SOCKET PROTECTION: Active & Maintained
💣 FLOOD INTENSITY: Optimized for Stability
⚡ BATCH PROCESSING: Throttled (${BATCH_DELAY}ms delays)

🎯 TARGET IMPACT: ${successfulMessages} BOOM MESSAGES DELIVERED!
        `;

        await sock.sendMessage(chatId, {
            text: completionReport,
            ...channelInfo
        }, { quoted: message });

        return {
            success: !floodAborted,
            totalSent: successfulMessages,
            totalFailed: failedMessages,
            duration: totalTime,
            aborted: floodAborted
        };

    } catch (criticalError) {
        console.error("🚨 CRITICAL SULEXH COMMAND FAILURE:", criticalError);

        // Emergency error notification with fallback
        try {
            await sock.sendMessage(chatId, {
                text: `🚨💥 SULEXH FLOOD SYSTEM CRITICAL ERROR 💥🚨\n\n` +
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
            totalFailed: 7000,
            aborted: true
        };
    }
}

/**
 * Enhanced message sending with retry logic and socket health checks
 * @param {Object} sock - WhatsApp socket instance
 * @param {string} chatId - Target chat ID
 * @param {number} messageIndex - Message number for tracking
 * @param {number} retryAttempts - Number of retry attempts
 * @returns {Promise} Message send result
 */
async function sendFloodMessage(sock, chatId, messageIndex, retryAttempts = 1) {
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
            // Verify socket health before each message
            if (!sock.ws || !sock.ws.socket || sock.ws.socket.readyState !== 1) {
                throw new Error(`Socket not ready (attempt ${attempt + 1})`);
            }

            // Send the flood message with error handling
            const messageResult = await sock.sendMessage(chatId, { 
                text: `💥 SULEXH BOOM MESSAGE #${messageIndex} 💥\n⚡ High-Speed Flood Active ⚡` 
            }).catch(err => {
                throw new Error(`Send failed: ${err.message}`);
            });

            return {
                success: true,
                messageIndex: messageIndex,
                attempt: attempt + 1,
                messageId: messageResult?.key?.id
            };

        } catch (error) {
            console.log(`⚠️ Message ${messageIndex} attempt ${attempt + 1} failed: ${error.message}`);
            
            // If this was the last attempt, return failure
            if (attempt === retryAttempts) {
                return {
                    success: false,
                    messageIndex: messageIndex,
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

module.exports = sulexhCommand;
