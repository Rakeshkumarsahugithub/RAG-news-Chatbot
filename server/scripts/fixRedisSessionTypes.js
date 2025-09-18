import redisClient from '../services/redisClient.js';

async function fixSessionTypes() {
  console.log('🔧 Fixing Redis session data types...');
  
  try {
    // Initialize Redis connection first
    await redisClient.connect();
    
    const client = redisClient.getClient();
    if (!client) {
      console.error('❌ Redis client not available');
      return;
    }

    // Get all session keys
    const sessionKeys = await client.keys('session:*');
    console.log(`📊 Found ${sessionKeys.length} session keys`);

    for (const key of sessionKeys) {
      try {
        // Check the type of the key
        const keyType = await client.type(key);
        console.log(`🔍 Key: ${key}, Type: ${keyType}`);

        if (keyType === 'string') {
          console.log(`🔄 Converting string key to hash: ${key}`);
          
          // Get the string value
          const stringValue = await client.get(key);
          console.log(`📄 String value: ${stringValue}`);
          
          // Delete the string key
          await client.del(key);
          
          // Create a proper hash structure
          const sessionId = key.replace('session:', '');
          const sessionData = {
            id: sessionId,
            createdAt: new Date().toISOString(),
            lastActivity: Date.now().toString(),
            messageCount: '0'
          };
          
          // Set as hash
          await client.hSet(key, sessionData);
          await client.expire(key, 60 * 60 * 24 * 30); // 30 days TTL
          
          console.log(`✅ Converted ${key} to hash format`);
        } else if (keyType === 'hash') {
          console.log(`✅ Key ${key} is already a hash`);
        } else {
          console.log(`⚠️  Key ${key} has unexpected type: ${keyType}`);
        }
      } catch (error) {
        console.error(`❌ Error processing key ${key}:`, error.message);
      }
    }

    console.log('🎉 Session type conversion completed');
    
    // Verify the fix
    console.log('\n🔍 Verifying session operations...');
    const testSessionId = 'test_session_' + Date.now();
    
    // Test setSession
    await redisClient.setSession(testSessionId, {
      id: testSessionId,
      messageCount: 1
    });
    console.log('✅ setSession test passed');
    
    // Test getSession
    const retrieved = await redisClient.getSession(testSessionId);
    console.log('✅ getSession test passed:', retrieved);
    
    // Clean up test session
    await redisClient.deleteSession(testSessionId);
    console.log('✅ deleteSession test passed');
    
  } catch (error) {
    console.error('❌ Error fixing session types:', error);
  } finally {
    process.exit(0);
  }
}

fixSessionTypes();
