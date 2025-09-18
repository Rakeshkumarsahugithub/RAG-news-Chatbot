# RAG Chatbot Resources & References

## 📚 Core Technologies & Documentation

### Vector Databases
- **Qdrant** - High-performance vector database
  - [Quickstart Guide](https://qdrant.tech/documentation/quickstart/)
  - [Python Client](https://github.com/qdrant/qdrant-client)
  - [Cloud Service](https://cloud.qdrant.io/)

- **Pinecone** - Managed vector database
  - [Quickstart Guide](https://docs.pinecone.io/guides/get-started/quickstart)
  - [Python SDK](https://github.com/pinecone-io/pinecone-python-client)

### AI & Embeddings
- **Jina AI** - Multimodal embeddings and search
  - [Embeddings API](https://jina.ai/embeddings)
  - [MCP Server](https://github.com/jina-ai/MCP)
  - [Documentation](https://docs.jina.ai/)

- **Google AI Studio**
  - [API Keys](https://aistudio.google.com/apikey)
  - [Gemini API](https://ai.google.dev/)

### News Data Sources
- **News-Please** - News scraping framework
  - [GitHub Repository](https://github.com/fhamborg/news-please)
  - [Documentation](https://github.com/fhamborg/news-please/wiki)

- **Reuters Sitemaps**
  - [Sitemap Index](https://www.reuters.com/arc/outboundfeeds/sitemap-index/?outputType=xml)
  - [RSS Feeds](https://www.reuters.com/tools/rss)

### Session Management
- **Redis** - In-memory data structure store
  - [Python Client](https://github.com/redis/redis-py)
  - [Upstash Redis](https://upstash.com/redis)
  - [Documentation](https://redis.io/docs/)

## 🚀 Deployment & Hosting

### Cloud Platforms
- **Render.com** - Full-stack hosting
  - [Getting Started](https://render.com/)
  - [Node.js Deployment](https://render.com/docs/deploy-node-express-app)

- **Vercel** - Frontend deployment
  - [React Deployment](https://vercel.com/guides/deploying-react-with-vercel)

- **Railway** - Backend deployment
  - [Node.js Guide](https://docs.railway.app/guides/nodejs)

## 🛠️ Development Tools

### Frontend Development
- **v0.dev** - AI-powered React component generator
  - [Website](https://v0.dev/)
  - Generate UI components with AI

- **Bolt.new** - Full-stack development environment
  - [Website](https://bolt.new/)
  - AI-assisted coding platform

- **Cursor** - AI-powered code editor
  - [Website](https://cursor.sh/)

### API Testing
- **Postman** - API development environment
  - [Download](https://www.postman.com/downloads/)

- **Thunder Client** - VS Code extension
  - [Marketplace](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client)

## 📦 Package Dependencies

### Server Dependencies
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "axios": "^1.5.0",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.10.0",
  "qdrant-client": "^1.5.0",
  "redis": "^4.6.8",
  "uuid": "^9.0.0",
  "@google/generative-ai": "^0.2.1"
}
```

### Client Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "socket.io-client": "^4.7.2",
  "axios": "^1.5.0",
  "react-icons": "^4.11.0",
  "uuid": "^9.0.0"
}
```

## 🔧 Configuration Examples

### Environment Variables (.env)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Services
GEMINI_API_KEY=your_gemini_api_key
JINA_API_KEY=your_jina_api_key

# Vector Database
QDRANT_URL=https://your-cluster.qdrant.tech
QDRANT_API_KEY=your_qdrant_api_key

# Session Storage
REDIS_URL=your_redis_connection_string
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Qdrant Collection Configuration
```javascript
const collectionConfig = {
  name: "news_articles",
  vectors: {
    size: 1024, // Jina embeddings dimension
    distance: "Cosine"
  },
  optimizers_config: {
    default_segment_number: 2
  },
  replication_factor: 1
};
```

## 📖 Learning Resources

### RAG Architecture
- [Retrieval-Augmented Generation Paper](https://arxiv.org/abs/2005.11401)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/use_cases/question_answering)
- [Building RAG Systems](https://www.pinecone.io/learn/retrieval-augmented-generation/)

### Vector Embeddings
- [Understanding Vector Embeddings](https://www.pinecone.io/learn/vector-embeddings/)
- [Sentence Transformers](https://www.sbert.net/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

### Real-time Applications
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [WebSocket vs Socket.IO](https://blog.logrocket.com/websocket-vs-socket-io/)

## 🎯 Best Practices

### Performance Optimization
1. **Vector Search**
   - Use appropriate similarity thresholds
   - Implement result caching
   - Optimize embedding dimensions

2. **Session Management**
   - Set appropriate TTL for sessions
   - Use connection pooling for Redis
   - Implement session cleanup

3. **API Rate Limiting**
   - Configure rate limits per endpoint
   - Implement exponential backoff
   - Monitor API usage

### Security
1. **API Keys**
   - Store in environment variables
   - Use different keys for dev/prod
   - Rotate keys regularly

2. **CORS Configuration**
   - Whitelist specific origins
   - Avoid wildcard in production
   - Use HTTPS in production

3. **Input Validation**
   - Sanitize user inputs
   - Validate message length
   - Implement content filtering

## 🔍 Monitoring & Analytics

### Logging
- **Winston** - Logging library
  - [Documentation](https://github.com/winstonjs/winston)

### Error Tracking
- **Sentry** - Error monitoring
  - [Node.js Integration](https://docs.sentry.io/platforms/node/)

### Analytics
- **Mixpanel** - Event tracking
  - [JavaScript SDK](https://developer.mixpanel.com/docs/javascript)

## 🧪 Testing

### Unit Testing
- **Jest** - Testing framework
  - [Documentation](https://jestjs.io/docs/getting-started)

### Integration Testing
- **Supertest** - HTTP testing
  - [GitHub](https://github.com/visionmedia/supertest)

### Load Testing
- **Artillery** - Load testing toolkit
  - [Documentation](https://artillery.io/docs/)

## 📱 Mobile Development

### React Native
- [Expo](https://expo.dev/)
- [React Native WebSocket](https://github.com/react-native-async-storage/async-storage)

### Progressive Web App
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox)

## 🤝 Community & Support

### Forums & Communities
- [Stack Overflow](https://stackoverflow.com/questions/tagged/rag)
- [Reddit r/MachineLearning](https://www.reddit.com/r/MachineLearning/)
- [Qdrant Discord](https://discord.gg/qdrant)
- [Jina AI Community](https://discord.jina.ai/)

### Blogs & Tutorials
- [Towards Data Science](https://towardsdatascience.com/)
- [Machine Learning Mastery](https://machinelearningmastery.com/)
- [Pinecone Blog](https://www.pinecone.io/blog/)

---

## 🚀 Quick Start Commands

### Development Setup
```bash
# Clone and setup server
cd server
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev

# Setup client
cd ../client
npm install
npm run dev
```

### Production Deployment
```bash
# Build client
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Database Operations
```bash
# Ingest news articles
node scripts/ingestNews.js

# Test Jina MCP integration
node scripts/testJinaMCP.js

# Fix Redis session types
node scripts/fixRedisSessionTypes.js
```

This comprehensive resource guide should help you and other developers work with your RAG chatbot effectively!
