import NewsScraper from '../services/newsScraper.js';

async function testNewsScraper() {
  console.log('🧪 Testing NewsScraper...');
  
  const scraper = new NewsScraper();
  
  try {
    console.log('🌐 Starting scrape with timeout...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout after 30 seconds')), 30000)
    );
    
    const scrapePromise = scraper.scrapeArticles(15);
    
    const articles = await Promise.race([scrapePromise, timeoutPromise]);
    
    console.log(`✅ Successfully scraped ${articles.length} articles`);
    
    if (articles.length > 0) {
      console.log('📄 Sample article:');
      console.log(`- Title: ${articles[0].title}`);
      console.log(`- Source: ${articles[0].source}`);
      console.log(`- Content length: ${articles[0].content?.length || 0} chars`);
    }
    
  } catch (error) {
    console.error('❌ NewsScraper test failed:', error.message);
  }
}

testNewsScraper();
