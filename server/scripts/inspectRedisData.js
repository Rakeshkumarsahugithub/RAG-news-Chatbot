import redisClient from '../services/redisClient.js';

async function inspectRedisData() {
  console.log('🔍 Inspecting Redis data...');
  
  try {
    await redisClient.connect();
    
    if (!redisClient.isConnected) {
      console.log('❌ Redis not connected');
      return;
    }

    // Get all keys
    const keys = await redisClient.client.keys('*');
    console.log(`\n📊 Total keys in Redis: ${keys.length}`);
    
    if (keys.length === 0) {
      console.log('📭 No data stored yet');
      return;
    }

    // Categorize keys
    const sessions = keys.filter(key => key.startsWith('session:'));
    const chatHistory = keys.filter(key => key.startsWith('chat:'));
    const queryCache = keys.filter(key => key.startsWith('query:'));
    const other = keys.filter(key => !key.startsWith('session:') && !key.startsWith('chat:') && !key.startsWith('query:'));

    console.log('\n📂 Data Categories:');
    console.log(`   Sessions: ${sessions.length}`);
    console.log(`   Chat History: ${chatHistory.length}`);
    console.log(`   Query Cache: ${queryCache.length}`);
    console.log(`   Other: ${other.length}`);

    // Show session details
    if (sessions.length > 0) {
      console.log('\n👤 Sessions:');
      for (const sessionKey of sessions.slice(0, 3)) {
        try {
          const keyType = await redisClient.client.type(sessionKey);
          console.log(`   ${sessionKey} (${keyType}):`);
          
          if (keyType === 'hash') {
            const sessionData = await redisClient.client.hGetAll(sessionKey);
            console.log(`     Last Activity: ${new Date(parseInt(sessionData.lastActivity)).toLocaleString()}`);
            console.log(`     Message Count: ${sessionData.messageCount || 0}`);
          } else if (keyType === 'string') {
            const sessionData = await redisClient.client.get(sessionKey);
            try {
              const parsed = JSON.parse(sessionData);
              console.log(`     Last Activity: ${new Date(parsed.lastActivity).toLocaleString()}`);
              console.log(`     Message Count: ${parsed.messageCount || 0}`);
            } catch (parseError) {
              console.log(`     Raw data: ${sessionData.substring(0, 100)}...`);
            }
          } else {
            console.log(`     Unexpected type: ${keyType}`);
          }
        } catch (error) {
          console.log(`     Error reading ${sessionKey}: ${error.message}`);
        }
      }
    }

    // Show chat history details
    if (chatHistory.length > 0) {
      console.log('\n💬 Chat History:');
      for (const chatKey of chatHistory.slice(0, 3)) {
        const messageCount = await redisClient.client.lLen(chatKey);
        console.log(`   ${chatKey}: ${messageCount} messages`);
        
        if (messageCount > 0) {
          const lastMessage = await redisClient.client.lIndex(chatKey, -1);
          const parsed = JSON.parse(lastMessage);
          console.log(`     Last: ${parsed.role} - ${parsed.content.substring(0, 50)}...`);
        }
      }
    }

    // Calculate storage usage
    let totalSize = 0;
    for (const key of keys) {
      const type = await redisClient.client.type(key);
      let size = 0;
      
      switch (type) {
        case 'string':
          const value = await redisClient.client.get(key);
          size = Buffer.byteLength(value, 'utf8');
          break;
        case 'list':
          const listItems = await redisClient.client.lRange(key, 0, -1);
          size = listItems.reduce((acc, item) => acc + Buffer.byteLength(item, 'utf8'), 0);
          break;
        case 'hash':
          const hashData = await redisClient.client.hGetAll(key);
          size = Object.entries(hashData).reduce((acc, [k, v]) => 
            acc + Buffer.byteLength(k, 'utf8') + Buffer.byteLength(v, 'utf8'), 0);
          break;
      }
      totalSize += size;
    }

    console.log(`\n📏 Estimated storage usage: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);

  } catch (error) {
    console.error('❌ Error inspecting Redis data:', error);
  }
  
  process.exit(0);
}

inspectRedisData();
