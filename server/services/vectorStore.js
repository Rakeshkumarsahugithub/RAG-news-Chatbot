import { QdrantClient } from '@qdrant/qdrant-js';
import { config } from '../config/index.js';

class VectorStore {
  constructor() {
    this.client = null;
    this.collectionName = 'news_articles';
    this.vectorSize = config.rag.vectorDimension;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Qdrant vector store...');
      
      // Initialize Qdrant client with proper configuration
      const qdrantConfig = {
        url: config.qdrant.url,
        apiKey: config.qdrant.apiKey || undefined,
      };
      
      console.log(`🔗 Connecting to Qdrant at: ${config.qdrant.url}`);
      this.client = new QdrantClient(qdrantConfig);

      // Check if Qdrant is accessible and get collections
      let collections;
      try {
        collections = await this.client.getCollections();
        console.log('✅ Connected to Qdrant successfully');
      } catch (error) {
        console.error('❌ Failed to connect to Qdrant:', error.message);
        throw error;
      }

      // Check if collection exists, create if not
      const collectionExists = collections.collections.some(
        collection => collection.name === this.collectionName
      );

      if (!collectionExists) {
        await this.createCollection();
      } else {
        console.log(`📁 Collection '${this.collectionName}' already exists`);
      }

      this.isInitialized = true;
      console.log('🚀 Vector store initialized successfully');
      
      // Skip verification during initialization to prevent hanging
      // Verification will be done later when needed
      
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      
      // Try to use in-memory fallback
      console.log('🔄 Attempting to use in-memory vector store fallback...');
      await this.initializeFallback();
    }
  }

  async createCollection() {
    try {
      console.log(`📁 Creating collection '${this.collectionName}'...`);
      
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine', // Good for text embeddings
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      console.log(`✅ Collection '${this.collectionName}' created successfully`);
    } catch (error) {
      console.error('❌ Failed to create collection:', error);
      throw error;
    }
  }

  async upsertVector(data) {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    const { id, vector, payload } = data;

    if (!id || !vector || !Array.isArray(vector)) {
      throw new Error('Invalid vector data: id, vector array required');
    }

    if (vector.length !== this.vectorSize) {
      throw new Error(`Vector size mismatch: expected ${this.vectorSize}, got ${vector.length}`);
    }

    try {
      if (this.client) {
        // Using Qdrant
        await this.client.upsert(this.collectionName, {
          wait: true,
          points: [
            {
              id: this.hashId(id),
              vector: vector,
              payload: payload || {},
            },
          ],
        });
      } else {
        // Using in-memory fallback
        this.inMemoryVectors.set(id, { vector, payload });
      }
    } catch (error) {
      console.error('❌ Failed to upsert vector:', error);
      throw error;
    }
  }

  async searchSimilar(queryVector, limit = config.rag.topKResults, filter = null) {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    if (!Array.isArray(queryVector) || queryVector.length !== this.vectorSize) {
      throw new Error(`Invalid query vector: expected array of size ${this.vectorSize}`);
    }

    try {
      if (this.client) {
        // Using Qdrant
        const searchResult = await this.client.search(this.collectionName, {
          vector: queryVector,
          limit: limit,
          filter: filter,
          with_payload: true,
          with_vector: false, // We don't need the vectors in response
        });

        return searchResult.map(result => ({
          id: result.id,
          score: result.score,
          payload: result.payload,
        }));
      } else {
        // Using in-memory fallback
        return this.searchInMemory(queryVector, limit);
      }
    } catch (error) {
      console.error('❌ Failed to search vectors:', error);
      throw error;
    }
  }

  async getCollectionInfo() {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      if (this.client) {
        const info = await this.client.getCollection(this.collectionName);
        
        // Get actual vector count using search since getCollection may not be accurate
        const actualCount = await this.countVectors();
        
        return {
          ...info,
          vectors_count: actualCount,
          actual_vectors_count: actualCount
        };
      } else {
        return {
          vectors_count: this.inMemoryVectors.size,
          status: 'green',
          optimizer_status: 'ok',
        };
      }
    } catch (error) {
      console.error('❌ Failed to get collection info:', error);
      throw error;
    }
  }

  async countVectors() {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      if (this.client) {
        // Use search with a dummy vector to count actual stored vectors
        const searchResult = await this.client.search(this.collectionName, {
          vector: Array(this.vectorSize).fill(0.1),
          limit: 10000, // High limit to get all vectors
          with_payload: false,
          with_vector: false
        });
        return searchResult.length;
      } else {
        return this.inMemoryVectors.size;
      }
    } catch (error) {
      console.error('❌ Failed to count vectors:', error);
      return 0;
    }
  }

  async deleteCollection() {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      if (this.client) {
        await this.client.deleteCollection(this.collectionName);
        console.log(`🗑️  Collection '${this.collectionName}' deleted`);
      } else {
        this.inMemoryVectors.clear();
        console.log('🗑️  In-memory vectors cleared');
      }
    } catch (error) {
      console.error('❌ Failed to delete collection:', error);
      throw error;
    }
  }

  // Fallback in-memory vector store
  async initializeFallback() {
    console.log('🔄 Initializing in-memory vector store fallback...');
    this.client = null;
    this.inMemoryVectors = new Map();
    this.isInitialized = true;
    console.log('✅ In-memory vector store initialized');
  }

  searchInMemory(queryVector, limit) {
    const results = [];
    
    for (const [id, data] of this.inMemoryVectors.entries()) {
      const score = this.cosineSimilarity(queryVector, data.vector);
      results.push({
        id: id,
        score: score,
        payload: data.payload,
      });
    }

    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Helper function to create numeric ID from string
  hashId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Utility methods for health check

  async healthCheck() {
    try {
      if (this.client) {
        const collections = await this.client.getCollections();
        return {
          status: 'healthy',
          backend: 'qdrant',
          collections: collections.collections.length,
        };
      } else {
        return {
          status: 'healthy',
          backend: 'in-memory',
          vectors: this.inMemoryVectors.size,
        };
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  // Batch operations for better performance
  async upsertBatch(vectorsData) {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    if (!Array.isArray(vectorsData) || vectorsData.length === 0) {
      throw new Error('Invalid vectors data: expected non-empty array');
    }

    try {
      if (this.client) {
        const points = vectorsData.map(data => ({
          id: this.hashId(data.id),
          vector: data.vector,
          payload: data.payload || {},
        }));

        await this.client.upsert(this.collectionName, {
          wait: true,
          points: points,
        });
      } else {
        // In-memory batch insert
        for (const data of vectorsData) {
          this.inMemoryVectors.set(data.id, {
            vector: data.vector,
            payload: data.payload,
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to batch upsert vectors:', error);
      throw error;
    }
  }
}

export default VectorStore;