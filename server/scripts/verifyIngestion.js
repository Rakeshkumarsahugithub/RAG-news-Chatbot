import { QdrantClient } from '@qdrant/qdrant-js';
import { config } from '../config/index.js';

async function verifyIngestion() {
  console.log('🔍 Verifying ingestion results...');
  
  const client = new QdrantClient({
    url: config.qdrant.url,
    apiKey: config.qdrant.apiKey,
    timeout: 10000
  });
  
  const collectionName = 'news_articles';
  
  try {
    // Get collection info
    const collection = await client.getCollection(collectionName);
    console.log(`📊 Collection status: ${collection.status}`);
    
    // Test search to count actual vectors
    const searchResults = await client.search(collectionName, {
      vector: Array(768).fill(0.1),
      limit: 100,
      with_payload: true,
      with_vector: false
    });
    
    console.log(`✅ Total vectors found: ${searchResults.length}`);
    
    if (searchResults.length > 0) {
      // Analyze sources
      const sources = [...new Set(searchResults.map(r => r.payload?.source).filter(Boolean))];
      console.log(`📰 Sources: ${sources.join(', ')}`);
      
      // Show sample articles
      console.log('\n📝 Sample articles:');
      searchResults.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.payload?.articleTitle || 'No title'}`);
        console.log(`   Source: ${result.payload?.source || 'Unknown'}`);
        console.log(`   Score: ${result.score.toFixed(4)}`);
      });
      
      // Count by source
      const sourceCounts = {};
      searchResults.forEach(r => {
        const source = r.payload?.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      
      console.log('\n📊 Vectors by source:');
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`- ${source}: ${count} vectors`);
      });
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyIngestion().catch(console.error);
