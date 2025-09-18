import { createClient } from 'redis';
import { config } from '../config/index.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackMode = false;
    this.inMemoryStore = new Map();
    this.inMemoryLists = new Map();
    this.connectionAttempted = false;
    this.connectionPromise = null;
  }

  async connect() {
    // Prevent multiple connection attempts
    if (this.connectionAttempted) {
      return this.connectionPromise;
    }

    this.connectionAttempted = true;
    this.connectionPromise = this._attemptConnection();
    return this.connectionPromise;
  }

  async _attemptConnection() {
    try {
      // Check if Redis is likely available first
      const isRedisAvailable = await this._checkRedisAvailability();
      if (!isRedisAvailable) {
        console.log('⚠️  Redis not available, using in-memory fallback');
        this.fallbackMode = true;
        this.isConnected = false;
        return null;
      }

      // Check if using Upstash Redis
      const isUpstash = config.redis.host.includes('upstash.io');
      
      if (isUpstash) {
        // Upstash Redis configuration - try multiple formats
        console.log('🔧 Attempting Upstash Redis connection...');
        
        try {
          // Try rediss:// (Redis with SSL) - format for Upstash
          const redisUrl = `rediss://:${config.redis.password}@${config.redis.host}:${config.redis.port}`;
          console.log(`🔗 Connecting to Redis at: ${redisUrl.replace(/:([^@]+)@/, ':***@')}`);
          
          this.client = createClient({
            url: redisUrl,
            socket: {
              tls: true,
              rejectUnauthorized: false
            }
          });
        } catch (urlError) {
          console.error('⚠️  Failed to connect with rediss://, trying fallback...', urlError.message);
          // Fallback to socket configuration
          this.client = createClient({
            socket: {
              host: config.redis.host,
              port: config.redis.port,
              tls: true,
              connectTimeout: 15000,
            },
            password: config.redis.password,
          });
        }
      } else {
        // Local Redis configuration
        this.client = createClient({
          socket: {
            host: config.redis.host,
            port: config.redis.port,
            connectTimeout: 10000,
            lazyConnect: true,
          },
          password: config.redis.password || undefined,
        });
      }

      this.client.on('error', (err) => {
        if (!this.fallbackMode) {
          console.log('⚠️  Redis connection failed, switching to in-memory fallback');
          this.fallbackMode = true;
          this.isConnected = false;
        }
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis');
        this.isConnected = true;
        this.fallbackMode = false;
      });

      this.client.on('disconnect', () => {
        console.log('🔌 Disconnected from Redis');
        this.isConnected = false;
        this.fallbackMode = true;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.log('⚠️  Redis connection failed, using in-memory fallback');
      this.fallbackMode = true;
      this.isConnected = false;
      return null;
    }
  }

  async _checkRedisAvailability() {
    // For Upstash, skip the availability check and try direct connection
    if (config.redis.host.includes('upstash.io')) {
      return true;
    }
    
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1000);

      socket.connect(config.redis.port, config.redis.host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  getClient() {
    if (this.fallbackMode) {
      return null; // Use fallback methods
    }
    if (!this.client || !this.isConnected) {
      // Don't switch to fallback mode here - just return null
      return null;
    }
    return this.client;
  }

  // Session management methods
  async setSession(sessionId, data, ttl = 60 * 60 * 24 * 7) { // Default 1 week TTL
    if (this.fallbackMode) {
      this.inMemoryStore.set(`session:${sessionId}`, {
        data: data,
        expires: Date.now() + (ttl * 1000),
      });
      return;
    }

    try {
      const key = `session:${sessionId}`;
      // Store as hash for better structure
      const sessionData = {
        id: data.id || sessionId,
        lastActivity: data.lastActivity || Date.now(),
        messageCount: data.messageCount || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        ...data
      };
      
      // Use HMSET for hash storage
      await this.client.hSet(key, sessionData);
      await this.client.expire(key, ttl);
    } catch (error) {
      console.error('Redis setSession error:', error);
      // Fallback to in-memory
      this.inMemoryStore.set(`session:${sessionId}`, {
        data: data,
        expires: Date.now() + (ttl * 1000),
      });
    }
  }

  async getSession(sessionId) {
    if (this.fallbackMode) {
      const stored = this.inMemoryStore.get(`session:${sessionId}`);
      if (!stored) return null;
      
      if (Date.now() > stored.expires) {
        this.inMemoryStore.delete(`session:${sessionId}`);
        return null;
      }
      
      return stored.data;
    }

    try {
      const key = `session:${sessionId}`;
      
      // Check key type first to avoid WRONGTYPE error
      const keyType = await this.client.type(key);
      
      if (keyType === 'hash') {
        const hashData = await this.client.hGetAll(key);
        return Object.keys(hashData).length > 0 ? hashData : null;
      } else if (keyType === 'string') {
        // Handle legacy string format - convert to hash
        const stringData = await this.client.get(key);
        if (stringData) {
          const parsedData = JSON.parse(stringData);
          
          // Delete old string key and recreate as hash
          await this.client.del(key);
          await this.setSession(sessionId, parsedData);
          
          return parsedData;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Redis getSession error:', error);
      // Fallback to in-memory
      const stored = this.inMemoryStore.get(`session:${sessionId}`);
      if (!stored) return null;
      
      if (Date.now() > stored.expires) {
        this.inMemoryStore.delete(`session:${sessionId}`);
        return null;
      }
      
      return stored.data;
    }
  }

  async deleteSession(sessionId) {
    if (this.fallbackMode) {
      this.inMemoryStore.delete(`session:${sessionId}`);
      return;
    }
    
    try {
      const client = this.getClient();
      if (client) {
        await client.del(`session:${sessionId}`);
      } else {
        this.fallbackMode = true;
        return this.deleteSession(sessionId);
      }
    } catch (error) {
      this.fallbackMode = true;
      return this.deleteSession(sessionId);
    }
  }

  // Chat history methods
  async addMessage(sessionId, message) {
    if (this.fallbackMode) {
      const key = `chat:${sessionId}`;
      if (!this.inMemoryLists.has(key)) {
        this.inMemoryLists.set(key, []);
      }
      
      const list = this.inMemoryLists.get(key);
      list.unshift({
        ...message,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only the latest messages
      if (list.length > config.session.chatHistoryLimit) {
        list.splice(config.session.chatHistoryLimit);
      }
      
      return;
    }
    
    try {
      const client = this.getClient();
      if (client) {
        const key = `chat:${sessionId}`;
        
        await client.lPush(key, JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
        }));
        
        await client.lTrim(key, 0, config.session.chatHistoryLimit - 1);
        await client.expire(key, config.session.ttl);
      } else {
        this.fallbackMode = true;
        return this.addMessage(sessionId, message);
      }
    } catch (error) {
      this.fallbackMode = true;
      return this.addMessage(sessionId, message);
    }
  }

  async getChatHistory(sessionId, limit = 20) {
    if (this.fallbackMode) {
      const key = `chat:${sessionId}`;
      const list = this.inMemoryLists.get(key) || [];
      return list.slice(0, limit).reverse();
    }
    
    try {
      const client = this.getClient();
      if (client) {
        const key = `chat:${sessionId}`;
        const messages = await client.lRange(key, 0, limit - 1);
        return messages.map(msg => JSON.parse(msg)).reverse();
      } else {
        this.fallbackMode = true;
        return this.getChatHistory(sessionId, limit);
      }
    } catch (error) {
      this.fallbackMode = true;
      return this.getChatHistory(sessionId, limit);
    }
  }

  async clearChatHistory(sessionId) {
    if (this.fallbackMode) {
      this.inMemoryLists.delete(`chat:${sessionId}`);
      return;
    }
    
    try {
      const client = this.getClient();
      if (client) {
        await client.del(`chat:${sessionId}`);
      } else {
        this.fallbackMode = true;
        return this.clearChatHistory(sessionId);
      }
    } catch (error) {
      this.fallbackMode = true;
      return this.clearChatHistory(sessionId);
    }
  }

  // Cache methods for RAG results
  async cacheQueryResult(query, result, ttl = 1800) { // 30 minutes
    if (this.fallbackMode) {
      const key = `query:${Buffer.from(query).toString('base64')}`;
      this.inMemoryStore.set(key, {
        data: result,
        expires: Date.now() + (ttl * 1000)
      });
      return;
    }
    
    try {
      const client = this.getClient();
      if (client) {
        const key = `query:${Buffer.from(query).toString('base64')}`;
        await client.setEx(key, ttl, JSON.stringify(result));
      } else {
        this.fallbackMode = true;
        return this.cacheQueryResult(query, result, ttl);
      }
    } catch (error) {
      this.fallbackMode = true;
      return this.cacheQueryResult(query, result, ttl);
    }
  }

  async getCachedQueryResult(query) {
    if (this.fallbackMode) {
      const key = `query:${Buffer.from(query).toString('base64')}`;
      const stored = this.inMemoryStore.get(key);
      if (!stored) return null;
      
      if (Date.now() > stored.expires) {
        this.inMemoryStore.delete(key);
        return null;
      }
      
      return stored.data;
    }
    
    try {
      const client = this.getClient();
      if (client) {
        const key = `query:${Buffer.from(query).toString('base64')}`;
        const result = await client.get(key);
        return result ? JSON.parse(result) : null;
      } else {
        this.fallbackMode = true;
        return this.getCachedQueryResult(query);
      }
    } catch (error) {
      this.fallbackMode = true;
      return this.getCachedQueryResult(query);
    }
  }
}

export default new RedisClient();