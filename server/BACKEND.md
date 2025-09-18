# RAG Chatbot Backend

A robust Node.js backend service that powers the RAG (Retrieval-Augmented Generation) chatbot with advanced news article processing, vector search, and AI-powered responses.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Redis server (local or cloud)
- Qdrant vector database
- MySQL database (optional)
- API keys for Gemini AI and Jina AI

### Installation
```bash
cd server
npm install
```

### Environment Setup
Copy the example environment file and configure:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
JINA_API_KEY=your_jina_api_key_here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# RAG Configuration
VECTOR_DIMENSION=768
TOP_K_RESULTS=5
MAX_CONTEXT_LENGTH=8000
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📁 Project Structure

```
server/
├── config/                # Configuration files
├── controllers/           # Request controllers (future expansion)
├── data/                 # Data files and samples
├── middleware/           # Express middleware
├── models/              # Data models (future expansion)
├── routes/              # API route definitions
│   ├── chat.js         # Chat-related endpoints
│   ├── health.js       # Health check endpoints
│   ├── search.js       # Search endpoints
│   └── session.js      # Session management
├── scripts/             # Utility and maintenance scripts
├── services/            # Core business logic services
│   ├── chatHistoryService.js  # Chat history management
│   ├── embeddingService.js    # Text embedding generation
│   ├── geminiService.js       # Google Gemini AI integration
│   ├── jinaMCPService.js      # Jina AI MCP service
│   ├── newsScraper.js         # News article scraping
│   ├── ragService.js          # RAG pipeline orchestration
│   ├── redisClient.js         # Redis connection and operations
│   └── vectorStore.js         # Qdrant vector database operations
├── utils/               # Utility functions (future expansion)
├── index.js            # Main application entry point
├── start.js            # Server startup script
└── package.json        # Dependencies and scripts
```

## 🏗️ Core Architecture

### Application Entry Point (index.js)
The main application file that:
- Initializes Express server with middleware
- Sets up CORS, security headers, and rate limiting
- Configures WebSocket connections
- Registers API routes
- Handles graceful shutdown

### Server Startup (start.js)
Handles server initialization:
- Environment validation
- Database connections
- Service health checks
- Graceful error handling

## 🛣️ API Routes

### Chat Routes (`/api/chat`)
**POST /api/chat/message**
- Processes user messages through RAG pipeline
- Returns AI-generated responses with source citations
- Supports streaming responses via WebSocket

**GET /api/chat/history/:sessionId**
- Retrieves chat history for a session
- Supports pagination and filtering
- Returns formatted message history

### Search Routes (`/api/search`)
**POST /api/search**
- Performs semantic search through news articles
- Returns ranked results with relevance scores
- Supports various search parameters

**GET /api/search/suggestions**
- Provides search suggestions based on query
- Returns autocomplete suggestions
- Cached for performance

### Session Routes (`/api/session`)
**POST /api/session/create**
- Creates new chat session
- Returns session ID and configuration
- Sets up session context

**GET /api/session/:sessionId**
- Retrieves session information
- Returns session metadata and status
- Validates session existence

**DELETE /api/session/:sessionId**
- Deletes session and associated data
- Cleans up chat history and cache
- Returns deletion confirmation

### Health Routes (`/api/health`)
**GET /api/health**
- Basic health check endpoint
- Returns server status and uptime
- Used for monitoring and load balancing

**GET /api/health/detailed**
- Comprehensive health check
- Tests all service connections
- Returns detailed system status

## 🔧 Core Services

### RAG Service (`ragService.js`)
The heart of the RAG pipeline that:
- Orchestrates the entire RAG workflow
- Manages context retrieval and ranking
- Integrates with AI services for response generation
- Handles source attribution and citation

**Key Methods:**
- `processQuery(query, sessionId)`: Main RAG processing
- `retrieveContext(query, topK)`: Context retrieval
- `generateResponse(query, context)`: AI response generation
- `rankSources(sources, query)`: Source ranking and filtering

### Embedding Service (`embeddingService.js`)
Handles text embedding generation:
- Integrates with Jina AI for high-quality embeddings
- Supports batch processing for efficiency
- Implements caching for frequently used embeddings
- Handles embedding dimension management

**Key Features:**
- Multiple embedding model support
- Automatic retry logic with exponential backoff
- Embedding cache management
- Batch processing optimization

### Vector Store Service (`vectorStore.js`)
Manages Qdrant vector database operations:
- Vector storage and retrieval
- Collection management and optimization
- Similarity search with filtering
- Index management and maintenance

**Key Operations:**
- `storeVectors(vectors, metadata)`: Store embeddings
- `searchSimilar(query, topK, filters)`: Similarity search
- `createCollection(name, config)`: Collection setup
- `optimizeIndex()`: Index optimization

### Gemini Service (`geminiService.js`)
Google Gemini AI integration:
- Response generation with context
- Conversation management
- Safety filtering and content moderation
- Token usage optimization

**Features:**
- Multiple model support (Gemini Pro, Gemini Pro Vision)
- Streaming response support
- Context window management
- Safety and content filtering

### Redis Client (`redisClient.js`)
Redis operations and caching:
- Connection management with retry logic
- Caching strategies for performance
- Session data storage
- Rate limiting implementation

**Caching Strategies:**
- Query result caching
- Embedding caching
- Session data caching
- Rate limiting counters

### News Scraper (`newsScraper.js`)
News article processing and ingestion:
- RSS feed parsing and monitoring
- Article content extraction
- Metadata processing and enrichment
- Duplicate detection and handling

**Supported Sources:**
- RSS feeds from major news outlets
- Direct article URL processing
- Batch article processing
- Real-time feed monitoring

### Chat History Service (`chatHistoryService.js`)
Chat session and history management:
- Session lifecycle management
- Message storage and retrieval
- History pagination and filtering
- Session cleanup and maintenance

## 🔌 WebSocket Integration

### Real-time Communication
WebSocket support for:
- Streaming AI responses
- Real-time search suggestions
- Live chat updates
- Connection status monitoring

### Socket Events
**Client to Server:**
- `chat_message`: Send chat message
- `search_query`: Perform search
- `join_session`: Join chat session

**Server to Client:**
- `chat_response`: AI response (streaming)
- `search_results`: Search results
- `error`: Error notifications
- `status_update`: Connection status

## 🗄️ Data Management

### Redis Data Structure
```
sessions:{sessionId} -> Session metadata
chat_history:{sessionId} -> Message history
embeddings:{hash} -> Cached embeddings
search_cache:{query_hash} -> Search results
rate_limit:{ip} -> Rate limiting counters
```

### Qdrant Collections
- **news_articles**: Main article collection
- **embeddings**: Text embeddings storage
- **metadata**: Article metadata and filters

### MySQL Schema (Optional)
```sql
-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

-- Messages table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36),
    message_type ENUM('user', 'assistant'),
    content TEXT,
    sources JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based session management
- API key validation
- Rate limiting per IP and user
- Request validation and sanitization

### Security Middleware
- Helmet.js for security headers
- CORS configuration
- Request size limiting
- Input validation and sanitization

### Data Protection
- Environment variable encryption
- Secure Redis connections
- API key rotation support
- Audit logging

## 📊 Performance Optimization

### Caching Strategy
- Multi-level caching (Redis, in-memory)
- Query result caching with TTL
- Embedding caching for reuse
- Search result caching

### Database Optimization
- Vector index optimization
- Query performance monitoring
- Connection pooling
- Batch operations

### Memory Management
- Garbage collection optimization
- Memory leak prevention
- Resource cleanup
- Connection management

## 🧪 Scripts and Utilities

### Data Ingestion Scripts
**`scripts/ingestNews.js`**
- Batch news article ingestion
- RSS feed processing
- Embedding generation and storage
- Progress tracking and logging

**`scripts/ingestRealTimeArticles.js`**
- Real-time article monitoring
- Continuous feed processing
- Incremental updates
- Error handling and recovery

### Testing Scripts
**`scripts/testEmbeddingService.js`**
- Embedding service testing
- Performance benchmarking
- API connectivity testing
- Error scenario testing

**`scripts/checkVectorStore.js`**
- Vector database health check
- Index status verification
- Performance metrics
- Data integrity checks

### Maintenance Scripts
**`scripts/allInOneTest.js`**
- Comprehensive system testing
- End-to-end workflow testing
- Service integration testing
- Performance monitoring

## 🔍 Monitoring and Logging

### Health Monitoring
- Service health checks
- Database connection monitoring
- API response time tracking
- Error rate monitoring

### Logging Strategy
- Structured logging with Winston
- Log levels (error, warn, info, debug)
- Request/response logging
- Performance metrics logging

### Metrics Collection
- API endpoint metrics
- Database query performance
- Cache hit/miss rates
- Memory and CPU usage

## 🚀 Deployment

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Configuration
- Production environment variables
- Service discovery configuration
- Load balancer setup
- SSL/TLS configuration

### Scaling Considerations
- Horizontal scaling with load balancers
- Redis cluster for high availability
- Qdrant cluster configuration
- Stateless service design

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Database Configuration
REDIS_HOST=redis-cluster.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
REDIS_TLS=true

# AI Service Configuration
GEMINI_API_KEY=your_production_key
JINA_API_KEY=your_production_key

# Vector Database
QDRANT_URL=https://qdrant-cluster.example.com
QDRANT_API_KEY=your_qdrant_key

# Performance Tuning
MAX_CONCURRENT_REQUESTS=100
CACHE_TTL=3600
EMBEDDING_BATCH_SIZE=50
```

### Service Configuration
- Rate limiting configuration
- Cache TTL settings
- Database connection pools
- API timeout settings

## 🐛 Troubleshooting

### Common Issues
1. **Redis Connection Errors**: Check Redis server status and credentials
2. **Qdrant Connection Issues**: Verify Qdrant URL and API key
3. **API Rate Limits**: Check API key quotas and usage
4. **Memory Issues**: Monitor memory usage and optimize queries

### Debug Mode
Enable debug logging:
```env
NODE_ENV=development
DEBUG=rag-chatbot:*
```

### Performance Issues
- Monitor database query performance
- Check cache hit rates
- Analyze memory usage patterns
- Review API response times

## 📚 Dependencies

### Core Dependencies
- **Express 4.18.2**: Web framework
- **Socket.io 4.7.4**: WebSocket support
- **@google/generative-ai 0.2.1**: Gemini AI integration
- **@qdrant/qdrant-js 1.7.0**: Vector database client
- **ioredis 5.7.0**: Redis client
- **axios 1.12.2**: HTTP client

### Security Dependencies
- **helmet 7.1.0**: Security headers
- **cors 2.8.5**: CORS handling
- **express-rate-limit 7.1.5**: Rate limiting
- **jsonwebtoken 9.0.2**: JWT handling

### Development Dependencies
- **nodemon 3.0.2**: Development server
- **concurrently 8.2.2**: Concurrent script execution

## 🤝 API Documentation

### Request/Response Format
All API endpoints follow RESTful conventions with JSON payloads:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Handling
Standardized error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
