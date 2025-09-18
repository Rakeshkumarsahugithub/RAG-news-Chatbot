import EmbeddingService from './embeddingService.js';
import VectorStore from './vectorStore.js';
import GeminiService from './geminiService.js';
import RedisClient from './redisClient.js';
import ChatHistoryService from './chatHistoryService.js';
import { config } from '../config/index.js';

class RAGService {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.geminiService = new GeminiService();
    this.redisClient = RedisClient;
    this.chatHistory = ChatHistoryService;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing RAG service...');

      // Initialize services sequentially with individual timeouts
      console.log('🔧 Initializing Redis connection...');
      try {
        await Promise.race([
          this.redisClient.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
          )
        ]);
        console.log('✅ Redis connection completed');
      } catch (error) {
        console.log('⚠️  Redis using in-memory fallback');
      }

      console.log('🔧 Initializing Gemini service...');
      try {
        await Promise.race([
          this.geminiService.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini initialization timeout')), 10000)
          )
        ]);
        console.log('✅ Gemini service initialized');
      } catch (error) {
        console.log('⚠️  Gemini service using fallback mode');
      }

      console.log('🔧 Initializing vector store...');
      try {
        await Promise.race([
          this.vectorStore.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Vector store initialization timeout')), 20000)
          )
        ]);
        console.log('✅ Vector store initialized');
      } catch (error) {
        console.log('⚠️  Vector store using fallback mode');
      }

      // Test embedding service (optional, non-blocking)
      console.log('🔧 Testing embedding service...');
      try {
        await Promise.race([
          this.embeddingService.testConnection(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Embedding test timeout')), 5000)
          )
        ]);
        console.log('✅ Embedding service test completed');
      } catch (error) {
        console.log('⚠️  Embedding service test failed or timed out, using fallback');
      }

      this.isInitialized = true;
      console.log('✅ RAG service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize RAG service:', error.message);
      // Don't throw - allow degraded mode
      this.isInitialized = true;
      console.log('⚠️  RAG service running in degraded mode');
    }
  }

  async processQuery(query, sessionId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    const {
      useCache = true,
      includeHistory = true,
      maxResults = config.rag.topKResults,
      minSimilarity = 0.3,
    } = options;

    try {
      console.log(`🔍 Processing query: "${query}" for session: ${sessionId}`);

      // Check cache first
      if (useCache) {
        const cachedResult = await this.redisClient.getCachedQueryResult(query);
        if (cachedResult) {
          console.log('💾 Returning cached result');
          return {
            ...cachedResult,
            cached: true,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Step 1: Generate embedding for the query
      console.log('🔤 Generating query embedding...');
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Step 2: Retrieve similar documents from vector store
      console.log('🔍 Searching vector store...');
      
      // Check if user is asking for recent/today's news
      const isRecentNewsQuery = query.toLowerCase().includes('today') || 
                               query.toLowerCase().includes('recent') || 
                               query.toLowerCase().includes('latest') ||
                               query.toLowerCase().includes('current');
      
      let searchResults;
      if (isRecentNewsQuery) {
        // For recent news queries, try to filter by date first
        const today = new Date();
        const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
        
        try {
          // Try searching with date filter for recent articles
          searchResults = await this.vectorStore.searchSimilar(
            queryEmbedding,
            maxResults * 2,
            {
              must: [
                {
                  range: {
                    publishDate: {
                      gte: threeDaysAgo.toISOString()
                    }
                  }
                }
              ]
            }
          );
          
          console.log(`🗓️  Found ${searchResults.length} recent articles`);
        } catch (error) {
          console.log('⚠️  Date filtering failed, using general search');
          // Fallback to general search
          searchResults = await this.vectorStore.searchSimilar(
            queryEmbedding,
            maxResults * 2
          );
        }
      } else {
        // Regular search without date filtering
        searchResults = await this.vectorStore.searchSimilar(
          queryEmbedding,
          maxResults * 2
        );
      }

      // Filter results by similarity threshold
      const relevantResults = searchResults.filter(
        result => result.score >= minSimilarity
      ).slice(0, maxResults);

      console.log(`📄 Found ${relevantResults.length} relevant documents`);

      // Step 3: Get conversation history if needed
      let conversationHistory = [];
      if (includeHistory) {
        conversationHistory = await this.redisClient.getChatHistory(sessionId, 10);
      }

      // Step 4: Generate response using Gemini
      console.log('🤖 Generating response...');
      const aiResponse = await this.geminiService.generateResponse(
        query,
        relevantResults,
        conversationHistory
      );

      // Step 5: Prepare final response
      const response = {
        query: query,
        response: aiResponse.response,
        model: aiResponse.model,
        sources: this.extractSources(relevantResults),
        contextUsed: relevantResults.length,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        cached: false,
        tokensUsed: aiResponse.tokensUsed || 0,
      };

      // Step 6: Cache the result
      if (useCache && response.response) {
        await this.redisClient.cacheQueryResult(query, response);
      }

      // Step 7: Store in chat history
      await this.redisClient.addMessage(sessionId, {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      });

      await this.redisClient.addMessage(sessionId, {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        contextUsed: response.contextUsed,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Query processed successfully');
      return response;

    } catch (error) {
      console.error('❌ Error processing query:', error);
      
      // Return a fallback response
      const fallbackResponse = {
        query: query,
        response: `I apologize, but I encountered an error while processing your question: "${query}". Please try again or rephrase your question.`,
        model: 'fallback',
        sources: [],
        contextUsed: 0,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        cached: false,
        error: error.message,
      };

      // Still store the user query in chat history
      try {
        await this.redisClient.addMessage(sessionId, {
          role: 'user',
          content: query,
          timestamp: new Date().toISOString(),
        });

        await this.redisClient.addMessage(sessionId, {
          role: 'assistant',
          content: fallbackResponse.response,
          error: true,
          timestamp: new Date().toISOString(),
        });
      } catch (historyError) {
        console.error('❌ Failed to store error in chat history:', historyError);
      }

      return fallbackResponse;
    }
  }

  async generateStreamingResponse(query, sessionId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Retrieve similar documents
      const searchResults = await this.vectorStore.searchSimilar(queryEmbedding, options.maxResults || config.rag.topKResults);
      const relevantResults = searchResults.filter(result => result.score >= (options.minSimilarity || 0.3));

      // Get conversation history
      const conversationHistory = options.includeHistory !== false 
        ? await this.redisClient.getChatHistory(sessionId, 10) 
        : [];

      // Generate streaming response
      const responseChunks = await this.geminiService.generateStreamingResponse(
        query,
        relevantResults,
        conversationHistory
      );

      // Store user message
      await this.redisClient.addMessage(sessionId, {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      });

      return {
        chunks: responseChunks,
        sources: this.extractSources(relevantResults),
        contextUsed: relevantResults.length,
        sessionId: sessionId,
      };

    } catch (error) {
      console.error('❌ Error generating streaming response:', error);
      throw error;
    }
  }

  extractSources(results) {
    const sources = [];
    const seenUrls = new Set();

    for (const result of results) {
      const payload = result.payload;
      if (payload && payload.articleUrl && !seenUrls.has(payload.articleUrl)) {
        sources.push({
          title: payload.articleTitle || 'Untitled Article',
          url: payload.articleUrl,
          source: payload.source || 'Unknown Source',
          publishDate: payload.publishDate,
          relevanceScore: result.score,
        });
        seenUrls.add(payload.articleUrl);
      }
    }

    return sources.slice(0, 5); // Limit to top 5 sources
  }

  async getChatHistory(sessionId, limit = 20) {
    try {
      return await this.redisClient.getChatHistory(sessionId, limit);
    } catch (error) {
      console.error('❌ Error getting chat history:', error);
      return [];
    }
  }

  async clearChatHistory(sessionId) {
    try {
      await this.redisClient.clearChatHistory(sessionId);
      await this.redisClient.deleteSession(sessionId);
      console.log(`🗑️  Cleared chat history for session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing chat history:', error);
      return false;
    }
  }

  async createSession(sessionData = {}) {
    try {
      const sessionId = this.generateSessionId();
      
      const session = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0,
        ...sessionData,
      };

      await this.redisClient.setSession(sessionId, session);
      console.log(`✅ Created new session: ${sessionId}`);
      
      return session;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      return await this.redisClient.getSession(sessionId);
    } catch (error) {
      console.error('❌ Error getting session:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionId) {
    if (!sessionId) return;
    
    try {
      // Get the current session or create a new one
      let session = await this.redisClient.getSession(sessionId) || {
        id: sessionId,
        lastActivity: Date.now()
      };
      
      // Update the last activity time
      session.lastActivity = Date.now();
      
      // Save the session with TTL of 1 week
      await this.redisClient.setSession(sessionId, session, 60 * 60 * 24 * 7);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  async addMessageToHistory(sessionId, message) {
    try {
      if (!sessionId || !message) {
        throw new Error('Session ID and message are required');
      }
      
      // Update session activity
      await this.updateSessionActivity(sessionId);
      
      // Add message to history using the correct method
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      };
      
      return await this.redisClient.addMessage(sessionId, messageWithTimestamp);
    } catch (error) {
      console.error('Error adding message to history:', error);
      throw error;
    }
  }

  async getChatHistory(sessionId, limit = 50) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      // Get chat history from Redis
      const history = await this.redisClient.getChatHistory(sessionId, limit);
      
      // Ensure each message has the required fields
      return history.map(msg => ({
        role: msg.role || 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || new Date().toISOString(),
        ...(msg.sources && { sources: msg.sources }),
        ...(msg.contextUsed && { contextUsed: msg.contextUsed }),
        ...(msg.model && { model: msg.model }),
        ...(msg.fallback && { fallback: true })
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      // Return empty array instead of throwing to prevent breaking the chat
      return [];
    }
  }

  async clearChatHistory(sessionId) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      // Clear the chat history
      await this.redisClient.clearChatHistory(sessionId);
      
      // Update the session to reset message count but keep the session alive
      let session = await this.redisClient.getSession(sessionId) || { id: sessionId };
      session.messageCount = 0;
      session.lastActivity = Date.now();
      
      // Save the updated session
      await this.redisClient.setSession(sessionId, session, 60 * 60 * 24 * 7); // 1 week TTL
      
      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  generateSessionId() {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  async healthCheck() {
    const health = {
      ragService: 'healthy',
      timestamp: new Date().toISOString(),
      components: {},
    };

    try {
      // Check all components
      const [embeddingHealth, vectorHealth, geminiHealth, redisHealth] = await Promise.allSettled([
        this.embeddingService.testConnection(),
        this.vectorStore.healthCheck(),
        this.geminiService.healthCheck(),
        Promise.resolve(this.redisClient.isConnected),
      ]);

      health.components.embedding = embeddingHealth.status === 'fulfilled' && embeddingHealth.value;
      health.components.vectorStore = vectorHealth.status === 'fulfilled' ? vectorHealth.value : { status: 'error' };
      health.components.gemini = geminiHealth.status === 'fulfilled' ? geminiHealth.value : { status: 'error' };
      health.components.redis = redisHealth.status === 'fulfilled' && redisHealth.value;

      // Overall health check
      const allHealthy = Object.values(health.components).every(component => 
        component === true || (typeof component === 'object' && component.status !== 'error')
      );

      health.ragService = allHealthy ? 'healthy' : 'degraded';

    } catch (error) {
      health.ragService = 'error';
      health.error = error.message;
    }

    return health;
  }

  async getStats() {
    try {
      const vectorCount = await this.vectorStore.countVectors();
      const collectionInfo = await this.vectorStore.getCollectionInfo();
      
      return {
        vectorCount: vectorCount,
        collectionStatus: collectionInfo.status,
        isInitialized: this.isInitialized,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default RAGService;