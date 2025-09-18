import NewsScraper from '../services/newsScraper.js';
import EmbeddingService from '../services/embeddingService.js';
import VectorStore from '../services/vectorStore.js';

console.log('🔍 Script loaded successfully');
console.log('📁 Current directory:', process.cwd());
console.log('🔧 Node version:', process.version);

async function ingestNews() {
  console.log('🚀 Starting news ingestion process...');
  
  try {
    // Step 1: Scrape news articles
    console.log('\n📰 Step 1: Scraping news articles...');
    const scraper = new NewsScraper();
    const articles = await scraper.scrapeArticles(5);
    
    if (articles.length === 0) {
      console.error('❌ No articles were scraped. Exiting...');
      process.exit(1);
    }
    
    // Save articles
    await scraper.saveArticles();
    
    // Display stats
    const stats = scraper.getStats();
    console.log('\n📊 Scraping Statistics:');
    console.log(`- Total articles: ${stats.totalArticles}`);
    console.log(`- Average content length: ${stats.averageContentLength} characters`);
    console.log(`- Sources: ${stats.sources.join(', ')}`);
    console.log(`- Date range: ${stats.dateRange.earliest.toDateString()} to ${stats.dateRange.latest.toDateString()}`);
    
    // Step 2: Initialize services
    console.log('\n🔧 Step 2: Initializing embedding and vector store services...');
    const embeddingService = new EmbeddingService();
    const vectorStore = new VectorStore();
    
    // Initialize vector store
    await vectorStore.initialize();
    
    // Step 3: Process articles and create embeddings
    console.log('\n🤖 Step 3: Creating embeddings and storing in vector database...');
    
    let processed = 0;
    const batchSize = 2; // Very small batch size to prevent memory issues
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      for (const article of batch) {
        try {
          // Create chunks from article content
          const chunks = createTextChunks(article);
          
          for (const chunk of chunks) {
            // Generate embeddings
            const embedding = await embeddingService.generateEmbedding(chunk.text);
            
            // Store in vector database
            await vectorStore.upsertVector({
              id: chunk.id,
              vector: embedding,
              payload: {
                text: chunk.text,
                articleId: article.id,
                articleTitle: article.title,
                articleUrl: article.url,
                source: article.source,
                publishDate: article.publishDate,
                chunkIndex: chunk.index,
                totalChunks: chunks.length
              }
            });
          }
          
          processed++;
          console.log(`✅ Processed article ${processed}/${articles.length}: ${article.title.substring(0, 60)}...`);
          
          // Rate limiting and memory cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
        } catch (error) {
          console.error(`❌ Error processing article ${article.id}:`, error.message);
          continue;
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < articles.length) {
        console.log('⏸️  Waiting between batches...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Additional memory cleanup between batches
        if (global.gc) {
          global.gc();
        }
      }
    }
    
    // Step 4: Create collection info
    const collectionInfo = await vectorStore.getCollectionInfo();
    console.log('\n📈 Vector Store Statistics:');
    console.log(`- Total vectors: ${collectionInfo.vectors_count}`);
    console.log(`- Collection status: ${collectionInfo.status}`);
    
    console.log('\n🎉 News ingestion completed successfully!');
    console.log('The chatbot is now ready to answer questions about the news articles.');
    
  } catch (error) {
    console.error('❌ Error during news ingestion:', error);
    process.exit(1);
  }
}

function createTextChunks(article, maxChunkSize = 1000, overlap = 200) {
  const fullText = `${article.title}

${article.description}

${article.content}`;
  const chunks = [];
  
  // Simple text chunking with overlap
  let start = 0;
  let chunkIndex = 0;
  
  while (start < fullText.length) {
    const end = Math.min(start + maxChunkSize, fullText.length);
    
    // Try to end at a sentence boundary
    let chunkEnd = end;
    if (end < fullText.length) {
      const lastPeriod = fullText.lastIndexOf('.', end);
      const lastNewline = fullText.lastIndexOf('\n', end);
      const boundary = Math.max(lastPeriod, lastNewline);
      
      if (boundary > start + maxChunkSize * 0.5) {
        chunkEnd = boundary + 1;
      }
    }
    
    const chunkText = fullText.slice(start, chunkEnd).trim();
    
    if (chunkText.length > 50) { // Only include meaningful chunks
      chunks.push({
        id: `${article.id}_chunk_${chunkIndex}`,
        text: chunkText,
        index: chunkIndex,
        start: start,
        end: chunkEnd
      });
      chunkIndex++;
    }
    
    // Move start position with overlap
    start = chunkEnd - overlap;
    if (start >= chunkEnd) break;
  }
  
  return chunks;
}

// Run the ingestion - simplified execution
console.log('🎯 Starting ingestion process...');
ingestNews()
  .then(() => {
    console.log('✅ Ingestion completed, exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ingestion failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });

export default ingestNews;