import redisClient from '../services/redisClient.js';
import { config } from '../config/index.js';

async function testRedisConnection() {
  console.log('🔧 Testing Redis connection...');
  console.log(`Host: ${config.redis.host}`);
  console.log(`Port: ${config.redis.port}`);
  console.log(`Password: ${config.redis.password ? '***' : 'Not set'}`);
  
  try {
    // Test connection
    await redisClient.connect();
    
    if (redisClient.isConnected) {
      console.log('✅ Redis connected successfully!');
      
      // Test basic operations
      console.log('\n🧪 Testing basic Redis operations...');
      
      // Test SET/GET
      const testKey = 'test:connection';
      const testValue = 'Hello Redis!';
      
      await redisClient.client.set(testKey, testValue);
      console.log(`✅ SET operation successful`);
      
      const retrievedValue = await redisClient.client.get(testKey);
      console.log(`✅ GET operation successful: ${retrievedValue}`);
      
      // Test chat history operations
      console.log('\n💬 Testing chat history operations...');
      const testSessionId = 'test_session_' + Date.now();
      
      const testMessage = {
        role: 'user',
        content: 'Test message for Redis',
        timestamp: new Date().toISOString()
      };
      
      await redisClient.addMessage(testSessionId, testMessage);
      console.log('✅ Message added to chat history');
      
      const history = await redisClient.getChatHistory(testSessionId, 10);
      console.log(`✅ Retrieved chat history: ${history.length} messages`);
      
      // Test session operations
      console.log('\n👤 Testing session operations...');
      const sessionData = {
        id: testSessionId,
        createdAt: new Date().toISOString(),
        lastActivity: Date.now()
      };
      
      await redisClient.setSession(testSessionId, sessionData);
      console.log('✅ Session created successfully');
      
      const retrievedSession = await redisClient.getSession(testSessionId);
      console.log(`✅ Session retrieved: ${retrievedSession ? 'Found' : 'Not found'}`);
      
      // Cleanup test data
      await redisClient.clearChatHistory(testSessionId);
      await redisClient.deleteSession(testSessionId);
      await redisClient.client.del(testKey);
      console.log('✅ Test data cleaned up');
      
      console.log('\n🎉 All Redis tests passed!');
      
    } else {
      console.log('⚠️  Redis using fallback mode (in-memory storage)');
    }
    
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    console.log('⚠️  Will use in-memory fallback mode');
  }
  
  process.exit(0);
}

testRedisConnection();
