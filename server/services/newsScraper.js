import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

class NewsScraper {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['pubDate', 'content:encoded', 'description']
      }
    });
    
    // Popular news RSS feeds
    this.rssFeeds = [
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://rss.reuters.com/reuters/world',
      'https://www.npr.org/rss/rss.php?id=1001',
      'https://feeds.skynews.com/feeds/rss/world.xml',
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://feeds.washingtonpost.com/rss/world',
      'https://www.theguardian.com/world/rss',
      'https://rss.usatoday.com/news/world',
      'https://feeds.foxnews.com/foxnews/world'
    ];
    
    this.articles = [];
  }

  async scrapeArticles(targetCount = 50) {
    console.log(`Starting to scrape ${targetCount} news articles...`);
    
    try {
      for (const feedUrl of this.rssFeeds) {
        if (this.articles.length >= targetCount) break;
        
        try {
          console.log(`Fetching from: ${feedUrl}`);
          const feed = await this.parser.parseURL(feedUrl);
          
          for (const item of feed.items) {
            if (this.articles.length >= targetCount) break;
            
            const article = await this.processArticle(item, feed.title);
            if (article && article.content && article.content.length > 300) {
              this.articles.push(article);
              console.log(`Scraped article ${this.articles.length}: ${article.title.substring(0, 60)}...`);
            }
            
            // Rate limiting to be respectful
            await this.delay(100);
          }
        } catch (error) {
          console.error(`Error processing feed ${feedUrl}:`, error.message);
          continue;
        }
      }
      
      console.log(`Successfully scraped ${this.articles.length} articles`);
      return this.articles;
      
    } catch (error) {
      console.error('Error during scraping:', error);
      throw error;
    }
  }

  async processArticle(item, sourceName) {
    try {
      const article = {
        id: this.generateId(),
        title: this.cleanText(item.title || ''),
        description: this.cleanText(item.description || item.summary || ''),
        content: '',
        url: item.link || '',
        source: sourceName || 'Unknown',
        publishDate: new Date(item.pubDate || item.isoDate || Date.now()).toISOString(),
        categories: item.categories || [],
        scraped_at: new Date().toISOString()
      };

      // Try to get full content
      if (item['content:encoded']) {
        article.content = this.extractTextFromHTML(item['content:encoded']);
      } else if (item.contentSnippet) {
        article.content = this.cleanText(item.contentSnippet);
      } else if (item.description) {
        article.content = this.extractTextFromHTML(item.description);
      }

      // If content is still short, try to fetch from URL
      if (article.content.length < 300 && article.url) {
        try {
          const fullContent = await this.fetchFullContent(article.url);
          if (fullContent && fullContent.length > article.content.length) {
            article.content = fullContent;
          }
        } catch (error) {
          console.log(`Could not fetch full content for: ${article.url}`);
        }
      }

      // Ensure we have meaningful content
      if (!article.content || article.content.length < 100) {
        article.content = article.description;
      }

      return article;
    } catch (error) {
      console.error('Error processing article:', error);
      return null;
    }
  }

  async fetchFullContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
      
      // Try to find main content
      const contentSelectors = [
        'article p',
        '.article-content p',
        '.content p',
        '.story-body p',
        '.entry-content p',
        '.post-content p',
        'main p',
        '[data-component="text-block"]',
        '.ArticleBody p'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          content = elements.map((i, el) => $(el).text().trim()).get().join('\n\n');
          break;
        }
      }
      
      // Fallback to all paragraphs if specific selectors don't work
      if (!content || content.length < 200) {
        content = $('p').map((i, el) => $(el).text().trim()).get()
          .filter(text => text.length > 50)
          .join('\n\n');
      }
      
      return this.cleanText(content);
    } catch (error) {
      console.error(`Error fetching content from ${url}:`, error.message);
      return null;
    }
  }

  extractTextFromHTML(html) {
    const $ = cheerio.load(html);
    $('script, style').remove();
    return this.cleanText($.text());
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveArticles(filename = 'news_articles.json') {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const filepath = path.join(dataDir, filename);
      await fs.writeFile(filepath, JSON.stringify(this.articles, null, 2));
      
      console.log(`Saved ${this.articles.length} articles to ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Error saving articles:', error);
      throw error;
    }
  }

  async loadArticles(filename = 'news_articles.json') {
    try {
      const filepath = path.join(process.cwd(), 'data', filename);
      const data = await fs.readFile(filepath, 'utf-8');
      this.articles = JSON.parse(data);
      console.log(`Loaded ${this.articles.length} articles from ${filepath}`);
      return this.articles;
    } catch (error) {
      console.error('Error loading articles:', error);
      return [];
    }
  }

  getArticles() {
    return this.articles;
  }

  getStats() {
    if (this.articles.length === 0) return null;
    
    const avgLength = this.articles.reduce((sum, article) => sum + article.content.length, 0) / this.articles.length;
    const sources = [...new Set(this.articles.map(article => article.source))];
    
    return {
      totalArticles: this.articles.length,
      averageContentLength: Math.round(avgLength),
      sources: sources,
      dateRange: {
        earliest: new Date(Math.min(...this.articles.map(a => new Date(a.publishDate)))),
        latest: new Date(Math.max(...this.articles.map(a => new Date(a.publishDate))))
      }
    };
  }
}

export default NewsScraper;