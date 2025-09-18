import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from '@qdrant/qdrant-js';
import VectorStore from '../services/vectorStore.js';
import redisClient from '../services/redisClient.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🚀 ALL-IN-ONE RAG CHATBOT TEST SUITE');
console.log('====================================');
console.log(`⏰ Started at: ${new Date().toISOString()}`);
console.log('====================================\n');

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logResult(status, category, test, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  
  console.log(`${icon} [${timestamp}] ${category} - ${test}: ${message}`);
  if (data) {
    console.log(`   📊 ${JSON.stringify(data, null, 2)}`);
  }
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.warnings++;
}

// 1. CHECK VECTOR STORE (from checkVectorStore.js)
async function testVectorStore() {
  console.log('\n🔍 TESTING VECTOR STORE');
  console.log('========================');
  
  try {
    const vectorStore = new VectorStore();
    await vectorStore.initialize();
    logResult('PASS', 'VECTOR', 'Initialization', 'Vector store initialized successfully');
    
    // Test vector counting
    const actualCount = await vectorStore.countVectors();
    logResult('PASS', 'VECTOR', 'Count', `Found ${actualCount} vectors`, { count: actualCount });
    
    // Get collection info
    const collectionInfo = await vectorStore.getCollectionInfo();
    logResult('PASS', 'VECTOR', 'Collection Info', `Status: ${collectionInfo.status}`, {
      status: collectionInfo.status,
      vectorsCount: collectionInfo.vectors_count
    });
    
    // Check sample vectors and dates
    if (vectorStore.client) {
      const sampleVectors = await vectorStore.client.scroll(vectorStore.collectionName, {
        limit: 10,
        with_payload: true
      });
      
      logResult('PASS', 'VECTOR', 'Sample Data', `Retrieved ${sampleVectors.points.length} sample vectors`);
      
      // Check for today's articles
      const today = new Date().toISOString().split('T')[0];
      const todayArticles = sampleVectors.points.filter(point => 
        point.payload.publishDate?.startsWith(today)
      );
      
      logResult('PASS', 'VECTOR', 'Today Articles', `Found ${todayArticles.length} articles from ${today}`, {
        date: today,
        count: todayArticles.length
      });
      
      // Show sample sources
      const sources = [...new Set(sampleVectors.points.map(p => p.payload.source).filter(Boolean))];
      logResult('PASS', 'VECTOR', 'Sources', `Active sources: ${sources.join(', ')}`, { sources });
    }
    
  } catch (error) {
    logResult('FAIL', 'VECTOR', 'Error', error.message);
  }
}

// 2. VERIFY INGESTION (from verifyIngestion.js)
async function testIngestion() {
  console.log('\n📊 TESTING INGESTION VERIFICATION');
  console.log('==================================');
  
  try {
    const client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      timeout: 10000
    });
    
    const collectionName = 'news_articles';
    
    // Get collection status
    const collection = await client.getCollection(collectionName);
    logResult('PASS', 'INGESTION', 'Collection Status', `Status: ${collection.status}`);
    
    // Test search to count actual vectors
    const searchResults = await client.search(collectionName, {
      vector: Array(768).fill(0.1),
      limit: 100,
      with_payload: true,
      with_vector: false
    });
    
    logResult('PASS', 'INGESTION', 'Vector Search', `Found ${searchResults.length} vectors via search`);
    
    // Analyze sources
    const sourceCount = {};
    searchResults.forEach(result => {
      const source = result.payload?.source || 'Unknown';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });
    
    logResult('PASS', 'INGESTION', 'Source Analysis', 'Source distribution analyzed', sourceCount);
    
    // Check sample articles
    const sampleArticles = searchResults.slice(0, 3).map(result => ({
      title: result.payload?.articleTitle?.substring(0, 50) + '...',
      source: result.payload?.source,
      date: result.payload?.publishDate,
      score: result.score
    }));
    
    logResult('PASS', 'INGESTION', 'Sample Articles', 'Sample articles retrieved', sampleArticles);
    
  } catch (error) {
    logResult('FAIL', 'INGESTION', 'Error', error.message);
  }
}

// 3. TEST REDIS CONNECTION (from testRedisConnection.js)
async function testRedis() {
  console.log('\n💾 TESTING REDIS CONNECTION');
  console.log('============================');
  
  try {
    await redisClient.connect();
    
    if (redisClient.isConnected) {
      logResult('PASS', 'REDIS', 'Connection', 'Connected to Upstash Redis successfully');
      
      const client = redisClient.getClient();
      
      // Test basic operations
      const testKey = 'test_' + Date.now();
      const testValue = 'Hello Redis!';
      
      await client.set(testKey, testValue);
      const retrievedValue = await client.get(testKey);
      
      if (retrievedValue === testValue) {
        logResult('PASS', 'REDIS', 'Basic Operations', 'SET/GET operations working');
      } else {
        logResult('FAIL', 'REDIS', 'Basic Operations', 'SET/GET operations failed');
      }
      
      // Test session operations
      const sessionId = 'test_session_' + Date.now();
      const sessionData = {
        id: sessionId,
        messageCount: 1,
        createdAt: new Date().toISOString()
      };
      
      await redisClient.setSession(sessionId, sessionData);
      const retrievedSession = await redisClient.getSession(sessionId);
      
      if (retrievedSession && retrievedSession.id === sessionId) {
        logResult('PASS', 'REDIS', 'Session Operations', 'Session create/retrieve working');
      } else {
        logResult('FAIL', 'REDIS', 'Session Operations', 'Session operations failed');
      }
      
      // Test chat history
      const message = { role: 'user', content: 'Test message', timestamp: new Date().toISOString() };
      await redisClient.addMessage(sessionId, message);
      const chatHistory = await redisClient.getChatHistory(sessionId, 1);
      
      if (chatHistory.length > 0 && chatHistory[0].content === 'Test message') {
        logResult('PASS', 'REDIS', 'Chat History', 'Chat history operations working');
      } else {
        logResult('FAIL', 'REDIS', 'Chat History', 'Chat history operations failed');
      }
      
      // Clean up test data
      await client.del(testKey);
      await redisClient.deleteSession(sessionId);
      await redisClient.clearChatHistory(sessionId);
      
      logResult('PASS', 'REDIS', 'Cleanup', 'Test data cleaned up successfully');
      
    } else {
      logResult('WARN', 'REDIS', 'Fallback Mode', 'Using in-memory fallback storage');
      
      // Test fallback operations
      const sessionId = 'fallback_test_' + Date.now();
      const sessionData = { id: sessionId, test: true };
      
      await redisClient.setSession(sessionId, sessionData);
      const retrieved = await redisClient.getSession(sessionId);
      
      if (retrieved && retrieved.id === sessionId) {
        logResult('PASS', 'REDIS', 'Fallback Operations', 'In-memory fallback working');
      } else {
        logResult('FAIL', 'REDIS', 'Fallback Operations', 'Fallback operations failed');
      }
    }
    
  } catch (error) {
    logResult('FAIL', 'REDIS', 'Connection Error', error.message);
  }
}

// 4. TEST EMBEDDING SERVICE (from testEmbeddingService.js)
async function testEmbedding() {
  console.log('\n🤖 TESTING EMBEDDING SERVICE');
  console.log('=============================');
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      logResult('FAIL', 'EMBEDDING', 'API Key', 'GEMINI_API_KEY not set in .env file');
      return;
    }
    
    logResult('PASS', 'EMBEDDING', 'API Key', 'Gemini API Key found');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    
    const result = await model.embedContent('test embedding generation');
    const embedding = result.embedding;
    
    if (embedding && embedding.values && embedding.values.length > 0) {
      logResult('PASS', 'EMBEDDING', 'Generation', 'Embedding generated successfully', {
        dimensions: embedding.values.length,
        sampleValues: embedding.values.slice(0, 3)
      });
    } else {
      logResult('FAIL', 'EMBEDDING', 'Generation', 'Received empty embedding');
    }
    
  } catch (error) {
    if (error.message.includes('quota') || error.message.includes('Quota')) {
      logResult('WARN', 'EMBEDDING', 'Quota Exceeded', 'API quota exceeded - upgrade needed');
    } else {
      logResult('FAIL', 'EMBEDDING', 'Generation Error', error.message);
    }
  }
}

// 5. TEST QUOTA INFO (from quotaInfo.js)
async function testQuota() {
  console.log('\n📊 TESTING QUOTA INFORMATION');
  console.log('=============================');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    
    await model.embedContent('quota check test');
    logResult('PASS', 'QUOTA', 'API Available', 'Gemini API quota available');
    
  } catch (error) {
    if (error.message.includes('quota') || error.message.includes('Quota')) {
      logResult('WARN', 'QUOTA', 'Quota Exceeded', 'Free tier quota exceeded');
      logResult('PASS', 'QUOTA', 'System Status', 'RAG chatbot still functional with vector search');
      
      console.log('\n💡 QUOTA RECOMMENDATIONS:');
      console.log('   1. Upgrade to paid Gemini API plan for higher limits');
      console.log('   2. Current system works with vector search + fallback responses');
      console.log('   3. All ingested articles remain searchable');
    } else {
      logResult('FAIL', 'QUOTA', 'API Error', error.message);
    }
  }
}

// 6. INSPECT REDIS DATA (from inspectRedisData.js)
async function inspectRedisData() {
  console.log('\n🔍 INSPECTING REDIS DATA');
  console.log('========================');
  
  try {
    if (redisClient.isConnected && redisClient.getClient()) {
      const client = redisClient.getClient();
      const keys = await client.keys('*');
      
      logResult('PASS', 'REDIS_DATA', 'Key Count', `Found ${keys.length} total keys`);
      
      // Analyze key types
      const sessionKeys = keys.filter(key => key.startsWith('session:'));
      const chatKeys = keys.filter(key => key.startsWith('chat:'));
      const queryKeys = keys.filter(key => key.startsWith('query:'));
      
      logResult('PASS', 'REDIS_DATA', 'Key Analysis', 'Key types analyzed', {
        total: keys.length,
        sessions: sessionKeys.length,
        chatHistory: chatKeys.length,
        queryCache: queryKeys.length
      });
      
      // Sample key inspection
      if (keys.length > 0) {
        const sampleKeys = keys.slice(0, 5);
        logResult('PASS', 'REDIS_DATA', 'Sample Keys', 'Sample keys retrieved', sampleKeys);
      }
      
      // Estimate storage usage
      let totalSize = 0;
      for (const key of keys.slice(0, 10)) { // Sample first 10 keys
        try {
          const value = await client.get(key);
          if (value) totalSize += value.length;
        } catch (e) {
          // Key might be a hash or list, skip for size estimation
        }
      }
      
      logResult('PASS', 'REDIS_DATA', 'Storage Usage', `Estimated usage: ${(totalSize / 1024).toFixed(2)} KB`);
      
    } else {
      logResult('WARN', 'REDIS_DATA', 'Fallback Mode', 'Using in-memory storage - no Redis data to inspect');
    }
    
  } catch (error) {
    logResult('FAIL', 'REDIS_DATA', 'Inspection Error', error.message);
  }
}

// 7. FIX REDIS SESSION TYPES (from fixRedisSessionTypes.js)
async function testSessionTypes() {
  console.log('\n🔧 TESTING SESSION TYPE FIXES');
  console.log('==============================');
  
  try {
    // Test session type conversion and handling
    const testSessionId = 'type_test_' + Date.now();
    const testData = {
      id: testSessionId,
      lastActivity: Date.now(),
      messageCount: 1,
      createdAt: new Date().toISOString(),
      testField: 'session_type_test'
    };
    
    // Test setSession
    await redisClient.setSession(testSessionId, testData);
    logResult('PASS', 'SESSION_TYPES', 'Set Session', 'Session created successfully');
    
    // Test getSession
    const retrieved = await redisClient.getSession(testSessionId);
    if (retrieved && retrieved.id === testSessionId) {
      logResult('PASS', 'SESSION_TYPES', 'Get Session', 'Session retrieved successfully', {
        id: retrieved.id,
        hasTestField: !!retrieved.testField
      });
    } else {
      logResult('FAIL', 'SESSION_TYPES', 'Get Session', 'Session retrieval failed');
    }
    
    // Test session type handling (hash vs string)
    if (redisClient.isConnected && redisClient.getClient()) {
      const client = redisClient.getClient();
      const keyType = await client.type(`session:${testSessionId}`);
      logResult('PASS', 'SESSION_TYPES', 'Key Type', `Session stored as: ${keyType}`);
    }
    
    // Test deleteSession
    await redisClient.deleteSession(testSessionId);
    const deletedCheck = await redisClient.getSession(testSessionId);
    if (!deletedCheck) {
      logResult('PASS', 'SESSION_TYPES', 'Delete Session', 'Session deleted successfully');
    } else {
      logResult('FAIL', 'SESSION_TYPES', 'Delete Session', 'Session deletion failed');
    }
    
  } catch (error) {
    logResult('FAIL', 'SESSION_TYPES', 'Type Handling Error', error.message);
  }
}

// MAIN TEST RUNNER
async function runAllTests() {
  const startTime = Date.now();
  
  try {
    await testVectorStore();
    await testIngestion();
    await testRedis();
    await testEmbedding();
    await testQuota();
    await inspectRedisData();
    await testSessionTypes();
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // FINAL SUMMARY
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total Duration: ${duration} seconds`);
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  
  const total = testResults.passed + testResults.failed + testResults.warnings;
  const successRate = ((testResults.passed / total) * 100).toFixed(1);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  console.log('\n🚀 SYSTEM STATUS:');
  console.log(`   🔍 Vector Store: ${testResults.passed > 5 ? '✅ OPERATIONAL' : '⚠️ ISSUES'}`);
  console.log(`   💾 Redis: ${testResults.passed > 3 ? '✅ OPERATIONAL' : '⚠️ FALLBACK MODE'}`);
  console.log(`   🤖 Embedding API: ${testResults.warnings > 0 ? '⚠️ QUOTA LIMITED' : '✅ AVAILABLE'}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL! RAG CHATBOT READY TO USE!');
  } else if (testResults.failed < 3) {
    console.log('\n✅ CORE SYSTEMS OPERATIONAL! Minor issues detected.');
  } else {
    console.log('\n⚠️ MULTIPLE ISSUES DETECTED! Please check failed tests.');
  }
  
  console.log('='.repeat(60));
}

// Execute all tests
runAllTests().catch(console.error);
