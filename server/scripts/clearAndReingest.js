import VectorStore from '../services/vectorStore.js';

async function clearAndReingest() {
  console.log('🧹 Clearing old data and preparing for fresh ingestion...');
  
  try {
    const vectorStore = new VectorStore();
    await vectorStore.initialize();
    
    // Delete the collection to start fresh
    try {
      await vectorStore.client.deleteCollection(vectorStore.collectionName);
      console.log('✅ Deleted old collection');
    } catch (error) {
      console.log('ℹ️  Collection may not exist, continuing...');
    }
    
    // Recreate the collection
    await vectorStore.createCollection();
    console.log('✅ Created fresh collection');
    
    console.log('🎉 Vector store is now clean and ready for fresh data!');
    console.log('💡 Run: node --expose-gc scripts/ingestUniqueArticles.js');
    
  } catch (error) {
    console.error('❌ Error clearing vector store:', error);
  }
}

clearAndReingest();
