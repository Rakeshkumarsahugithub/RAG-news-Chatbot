import axios from 'axios';
import { config } from '../config/index.js';

class EmbeddingService {
  constructor() {
    this.jinaApiKey = config.apis.jinaApiKey;
    this.apiUrl = 'https://api.jina.ai/v1/embeddings';
    this.model = 'jina-embeddings-v2-base-en'; // Free tier model
    this.maxBatchSize = 10; // Adjust based on API limits
  }

  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Clean and truncate text if necessary
    const cleanText = this.preprocessText(text);
    
    // If no API key, use fallback immediately
    if (!this.jinaApiKey) {
      console.log('🔄 No Jina API key, using fallback embedding');
      return this.generateFallbackEmbedding(cleanText);
    }
    
    try {
      const response = await this.callJinaAPI([cleanText]);
      
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      } else {
        throw new Error('No embedding data received from Jina API');
      }
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      
      // Fallback to a simple local embedding if Jina API fails
      if (error.response && error.response.status === 401) {
        console.warn('⚠️  Jina API key invalid or missing. Using fallback embedding method.');
      } else {
        console.warn('⚠️  Jina API failed. Using fallback embedding method.');
      }
      
      return this.generateFallbackEmbedding(cleanText);
    }
  }

  async generateBatchEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    const cleanTexts = texts.map(text => this.preprocessText(text));
    const embeddings = [];

    // Process in batches to respect API limits
    for (let i = 0; i < cleanTexts.length; i += this.maxBatchSize) {
      const batch = cleanTexts.slice(i, i + this.maxBatchSize);
      
      try {
        const response = await this.callJinaAPI(batch);
        
        if (response.data && response.data.length === batch.length) {
          embeddings.push(...response.data.map(item => item.embedding));
        } else {
          throw new Error(`Batch embedding failed: expected ${batch.length} embeddings, got ${response.data?.length || 0}`);
        }
        
        // Rate limiting between batches
        if (i + this.maxBatchSize < cleanTexts.length) {
          await this.delay(1000); // 1 second delay
        }
        
      } catch (error) {
        console.error(`Error in batch ${Math.floor(i / this.maxBatchSize) + 1}:`, error.message);
        
        // Generate fallback embeddings for this batch
        for (const text of batch) {
          embeddings.push(this.generateFallbackEmbedding(text));
        }
      }
    }

    return embeddings;
  }

  async callJinaAPI(texts) {
    if (!this.jinaApiKey) {
      throw new Error('Jina API key not configured');
    }

    const requestData = {
      model: this.model,
      input: texts
    };

    const response = await axios.post(this.apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${this.jinaApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // Reduced timeout to 10 seconds
    });

    return response.data;
  }

  preprocessText(text) {
    // Clean and normalize text
    let cleaned = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    // Truncate if too long (Jina has token limits)
    const maxLength = 8192; // Conservative limit
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
      
      // Try to end at a word boundary
      const lastSpace = cleaned.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.9) {
        cleaned = cleaned.substring(0, lastSpace);
      }
    }

    return cleaned;
  }

  // Simple fallback embedding using character frequency
  generateFallbackEmbedding(text, dimensions = 768) {
    console.warn('🔄 Using fallback embedding method');
    
    const embedding = new Array(dimensions).fill(0);
    
    // Simple hash-based embedding
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const index = char % dimensions;
      embedding[index] += 1;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    // Add some randomness to avoid identical embeddings
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] += (Math.random() - 0.5) * 0.01;
    }
    
    return embedding;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to check if the embedding service is properly configured
  async testConnection() {
    if (!this.jinaApiKey) {
      console.log('⚠️  Jina API key not configured, using fallback embedding');
      return true; // Don't fail, just use fallback
    }
    
    try {
      // Quick test with shorter timeout
      const testEmbedding = await Promise.race([
        this.generateEmbedding("Test sentence"),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 3000)
        )
      ]);
      
      console.log('✅ Embedding service test successful');
      console.log(`Embedding dimensions: ${testEmbedding.length}`);
      return true;
    } catch (error) {
      console.log('⚠️  Embedding service test failed, using fallback embedding');
      return true; // Don't fail, just use fallback
    }
  }

  // Calculate cosine similarity between two embeddings
  cosineSimilarity(embeddingA, embeddingB) {
    if (embeddingA.length !== embeddingB.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      normA += embeddingA[i] * embeddingA[i];
      normB += embeddingB[i] * embeddingB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export default EmbeddingService;