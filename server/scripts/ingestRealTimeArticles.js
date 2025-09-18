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
    await scraper.scrapeArticles(targetCount);
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

async function ingestRealTimeArticles() {
  console.log('🎯 Starting real-time articles ingestion process...');
  
  try {
    // Initialize services
    console.log('🔧 Initializing services...');
    const embeddingService = new EmbeddingService();
    const vectorStore = new VectorStore();
    
    await vectorStore.initialize();
    console.log('✅ Vector store initialized successfully');
    
    // Scrape real articles
    console.log('📰 Scraping real news articles...');
    const articles = await scrapeRealNewsArticles(50);
    console.log(`✅ Scraped ${articles.length} real articles`);
    
    // Process articles in batches with overlap chunking
    console.log('🤖 Processing articles and creating embeddings with overlap...');
    let processed = 0;
    const batchSize = 5;
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);
      
      for (const article of batch) {
        try {
          // Create chunks with overlap for better context
          const chunks = createTextChunksWithOverlap(article, 500, 100);
          
          for (const chunk of chunks) {
            // Generate embedding
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
                totalChunks: chunks.length,
                category: article.category,
                isRealTime: true,
                scrapedAt: new Date().toISOString()
              }
            });
          }
          
          processed++;
          console.log(`✅ Processed ${processed}/${articles.length}: ${article.title.substring(0, 60)}...`);
          
          // Small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Error processing ${article.id}: ${error.message}`);
          continue;
        }
      }
      
      // Delay between batches
      if (i + batchSize < articles.length) {
        console.log('⏸️  Cooling down between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Memory cleanup
      if (global.gc) {
        global.gc();
      }
    }
    
    // Save metadata
    const metadata = {
      totalArticles: articles.length,
      processedCount: processed,
      timestamp: new Date().toISOString(),
      sources: [...new Set(articles.map(a => a.source))],
      categories: [...new Set(articles.map(a => a.category))],
      dateRange: {
        earliest: new Date(Math.min(...articles.map(a => new Date(a.publishDate)))),
        latest: new Date(Math.max(...articles.map(a => new Date(a.publishDate))))
      },
      scrapingMethod: 'real-time',
      chunkingMethod: 'overlap',
      chunkSize: 500,
      overlapSize: 100
    };

    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      path.join(dataDir, 'realtime_articles_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Get vector store stats
    const vectorCount = await vectorStore.countVectors();
    
    console.log('\n📊 Real-time Articles Ingestion Complete!');
    console.log(`- Total articles scraped: ${metadata.totalArticles}`);
    console.log(`- Successfully processed: ${metadata.processedCount}`);
    console.log(`- Vector count: ${vectorCount}`);
    console.log(`- Sources: ${metadata.sources.join(', ')}`);
    console.log(`- Categories: ${metadata.categories.join(', ')}`);
    console.log(`- Date range: ${metadata.dateRange.earliest.toDateString()} to ${metadata.dateRange.latest.toDateString()}`);
    console.log(`- Chunking: ${metadata.chunkSize} chars with ${metadata.overlapSize} overlap`);
    console.log('🎉 Real-time news ingestion completed successfully!');
    
  } catch (error) {
    console.error('❌ Ingestion process failed:', error);
    process.exit(1);
  }
}

// Run the ingestion
ingestRealTimeArticles().catch(console.error);
