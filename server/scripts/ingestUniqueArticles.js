import EmbeddingService from '../services/embeddingService.js';
import VectorStore from '../services/vectorStore.js';
import NewsScraper from '../services/newsScraper.js';
import fs from 'fs/promises';
import path from 'path';

console.log('🔍 Real-time News Articles ingestion script starting...');

// Create text chunks with overlap for better context
function createTextChunksWithOverlap(article, chunkSize = 500, overlap = 100) {
  const text = `${article.title}\n\n${article.content}`;
  const chunks = [];
  
  if (text.length <= chunkSize) {
    chunks.push({
      id: `${article.id}_chunk_0`,
      text: text,
      index: 0
    });
  } else {
    let start = 0;
    let chunkIndex = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.slice(start, end);
      
      // Find a good breaking point (sentence end) if possible
      let breakPoint = end;
      if (end < text.length) {
        const lastSentenceEnd = chunkText.lastIndexOf('. ');
        if (lastSentenceEnd > chunkSize * 0.7) { // At least 70% of chunk size
          breakPoint = start + lastSentenceEnd + 2;
        }
      }
      
      chunks.push({
        id: `${article.id}_chunk_${chunkIndex}`,
        text: text.slice(start, breakPoint).trim(),
        index: chunkIndex
      });
      
      // Move start position with overlap
      start = Math.max(start + chunkSize - overlap, breakPoint);
      chunkIndex++;
      
      // Prevent infinite loop
      if (start >= text.length) break;
    }
  }
  
  return chunks;
}

// Scrape real articles from news sources
async function scrapeRealNewsArticles(targetCount = 50) {
  console.log(`🌐 Starting real-time scraping of ${targetCount} news articles...`);
  
  const scraper = new NewsScraper();
  
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout after 60 seconds')), 60000)
    );
    
    const scrapePromise = scraper.scrapeArticles(targetCount);
    
    await Promise.race([scrapePromise, timeoutPromise]);
    const articles = scraper.getArticles();
    
    console.log(`✅ Successfully scraped ${articles.length} real articles`);
    
    // Add unique IDs and ensure proper format
    return articles.map((article, index) => ({
      id: article.id || `scraped_${Date.now()}_${index}`,
      title: article.title,
      content: article.content,
      source: article.source || 'Unknown Source',
      category: article.category || 'General',
      publishDate: article.publishDate || new Date().toISOString(),
      url: article.url || article.link || '#'
    }));
    
  } catch (error) {
    console.error('❌ Error scraping articles:', error);
    throw error;
  }
}

// Add a timeout helper function with proper cleanup
function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
  let timeoutId;
  
  const wrappedPromise = new Promise((resolve, reject) => {
    // Set up the timeout
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    
    // Handle the original promise
    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
  
  return wrappedPromise;
}

async function ingestUniqueArticles() {
  console.log('🎯 Starting unique 50 articles ingestion process...');
  
  // Add a global timeout for the entire process (30 minutes)
  const globalTimeout = setTimeout(() => {
    console.error('❌ Process timed out after 30 minutes');
    process.exit(1);
  }, 30 * 60 * 1000);
  
  try {
    // Initialize services with timeout
    console.log('🔧 Initializing services...');
    const embeddingService = new EmbeddingService();
    const vectorStore = new VectorStore();
    
    await withTimeout(
      vectorStore.initialize(),
      120000, // 2 minutes - increased timeout for vector store initialization
      'Vector store initialization timed out'
    );
    console.log('✅ Vector store initialized successfully');
    
    // Scrape real news articles with timeout
    console.log('📰 Fetching latest news articles...');
    let articles;
    try {
      articles = await withTimeout(
        scrapeRealNewsArticles(50),
        5 * 60 * 1000, // 5 minutes
        'Article scraping timed out'
      );
      
      console.log(`✅ Fetched ${articles.length} real-time articles`);
      
      if (articles.length === 0) {
        console.log('⚠️  No articles fetched, exiting...');
        return;
      }
    } catch (error) {
      console.error('❌ Error fetching real articles:', error.message);
      console.log('❌ Script failed - unable to fetch news articles');
      return;
    }
    
    // Process articles in batches with better error handling
    console.log('🤖 Processing articles and creating embeddings...');
    let processed = 0;
    const batchSize = 3; // Reduced batch size for better stability
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(articles.length / batchSize);
      
      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (articles ${i + 1}-${Math.min(i + batchSize, articles.length)} of ${articles.length})`);
      
      // Process each article in the batch with timeout
      for (const [index, article] of batch.entries()) {
        const articleNumber = i + index + 1;
        console.log(`\n📝 Processing article ${articleNumber}/${articles.length}: ${article.title.substring(0, 80)}...`);
        
        try {
          const chunks = createTextChunksWithOverlap(article);
          console.log(`   ✂️  Split into ${chunks.length} chunks`);
          
          // Process each chunk with timeout
          for (const [chunkIndex, chunk] of chunks.entries()) {
            try {
              console.log(`   🔄 Processing chunk ${chunkIndex + 1}/${chunks.length}...`);
              
              // Generate embedding with timeout
              const embedding = await withTimeout(
                embeddingService.generateEmbedding(chunk.text),
                60000, // 60 seconds per embedding
                'Embedding generation timed out'
              );
              
              // Store in vector database with timeout
              await withTimeout(
                vectorStore.upsertVector({
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
                    totalChunks: chunks.length,
                    category: article.category || 'General'
                  }
                }),
                30000, // 30 seconds
                'Vector store update timed out'
              );
            } catch (chunkError) {
              console.error(`❌ Error processing chunk ${chunkIndex + 1}:`, chunkError.message);
              // Continue with next chunk even if one fails
              continue;
            }
          }
          
          processed++;
          console.log(`✅ Processed ${processed}/${articles.length}: ${article.title.substring(0, 60)}...`);
          
          // Add a small delay between articles to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (articleError) {
          console.error(`❌ Error processing article "${article.title}":`, articleError.message);
          // Continue with next article even if one fails
          continue;
        }
      }
      
      // Add a delay between batches
      if (i + batchSize < articles.length) {
        console.log('⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Save metadata
    const metadata = {
      totalArticles: articles.length,
      processedCount: processed,
      timestamp: new Date().toISOString(),
      sources: [...new Set(articles.map(a => a.source))],
      categories: [...new Set(articles.map(a => a.category || 'General'))],
      dateRange: {
        earliest: articles.length > 0 ? 
          new Date(Math.min(...articles.map(a => new Date(a.publishDate || new Date())))) : 
          new Date(),
        latest: articles.length > 0 ?
          new Date(Math.max(...articles.map(a => new Date(a.publishDate || new Date())))) :
          new Date()
      }
    };

    try {
      const dataDir = path.join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(
        path.join(dataDir, 'unique_articles_metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Get vector store stats
      const vectorCount = await vectorStore.countVectors();
      
      console.log('\n📊 Unique Articles Ingestion Complete!');
      console.log(`- Total articles: ${metadata.totalArticles}`);
      console.log(`- Successfully processed: ${metadata.processedCount}`);
      console.log(`- Vector count: ${vectorCount}`);
      console.log(`- Sources: ${metadata.sources.join(', ')}`);
      console.log(`- Categories: ${metadata.categories.join(', ')}`);
      
      if (articles.length > 0) {
        console.log(`- Date range: ${metadata.dateRange.earliest.toDateString()} to ${metadata.dateRange.latest.toDateString()}`);
      }
      
      console.log('🎉 Article ingestion completed successfully!');
    } catch (error) {
      console.error('❌ Error during finalization:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Ingestion process failed:', error);
    throw error;
  } finally {
    // Clear the global timeout
    clearTimeout(globalTimeout);
  }
}

// Run the ingestion with proper error handling
(async () => {
  try {
    await ingestUniqueArticles();
    console.log('✨ Article ingestion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during ingestion:', error);
    process.exit(1);
  }
})();
