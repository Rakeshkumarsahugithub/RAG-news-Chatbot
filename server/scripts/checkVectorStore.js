import VectorStore from '../services/vectorStore.js';

async function checkVectorStore() {
  console.log('🔍 Checking vector store contents...');
  
  try {
    const vectorStore = new VectorStore();
    await vectorStore.initialize();
    
    // Test vector counting (from testVectorCount.js)
    const actualCount = await vectorStore.countVectors();
    console.log(`✅ Actual vector count: ${actualCount}`);
    
    // Get collection info
    const collectionInfo = await vectorStore.getCollectionInfo();
    console.log('📊 Collection info:', collectionInfo);
    console.log(`📊 Vectors count verification: ${collectionInfo.vectors_count}`);
    
    // Get sample vectors to check dates
    const sampleVectors = await vectorStore.client.scroll(vectorStore.collectionName, {
      limit: 10,
      with_payload: true
    });
    
    console.log('\n📅 Sample article dates:');
    sampleVectors.points.forEach((point, index) => {
      const payload = point.payload;
      console.log(`${index + 1}. ${payload.articleTitle?.substring(0, 60)}...`);
      console.log(`   Date: ${payload.publishDate}`);
      console.log(`   Source: ${payload.source}`);
      console.log('');
    });
    
    // Check for today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayArticles = sampleVectors.points.filter(point => 
      point.payload.publishDate?.startsWith(today)
    );
    
    console.log(`🗓️  Articles from today (${today}): ${todayArticles.length}`);
    
    if (todayArticles.length === 0) {
      console.log('⚠️  No articles from today found. Consider running ingestion script.');
    }
    
  } catch (error) {
    console.error('❌ Error checking vector store:', error);
  }
}

checkVectorStore();
