import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    useTLS: process.env.REDIS_USE_TLS === 'true' || process.env.REDIS_HOST?.includes('upstash.io') || false,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'rag_chatbot',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  apis: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    jinaApiKey: process.env.JINA_API_KEY || '',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
  },
  rag: {
    vectorDimension: parseInt(process.env.VECTOR_DIMENSION) || 768,
    topKResults: parseInt(process.env.TOP_K_RESULTS) || 5,
    maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH) || 8000,
  },
  session: {
    ttl: parseInt(process.env.SESSION_TTL) || 3600, // 1 hour
    chatHistoryLimit: parseInt(process.env.CHAT_HISTORY_LIMIT) || 50,
  },
};