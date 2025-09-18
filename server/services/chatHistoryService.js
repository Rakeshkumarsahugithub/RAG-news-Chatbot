import redisClient from './redisClient.js';

class ChatHistoryService {
  constructor() {
    this.redis = redisClient;
    this.TTL_30_DAYS = 60 * 60 * 24 * 30; // 30 days in seconds
  }

  /**
   * Add a message to chat history
   * @param {string} sessionId - The chat session ID
   * @param {Object} message - The message object to store
   * @param {string} message.role - 'user' or 'assistant'
   * @param {string} message.content - The message content
   * @param {Array} [message.sources] - Optional sources/references
   * @param {Object} [message.metadata] - Additional metadata
   * @returns {Promise<boolean>} - True if successful
   */
  async addMessage(sessionId, message) {
    try {
      if (!sessionId || !message || !message.role || !message.content) {
        throw new Error('Session ID and message with role and content are required');
      }

      const key = this._getChatHistoryKey(sessionId);
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      };

      await this.redis.rpush(key, JSON.stringify(messageWithTimestamp));
      
      // Set expiration on the key if it's new
      await this.redis.expire(key, this.TTL_30_DAYS);
      
      return true;
    } catch (error) {
      console.error('Error adding message to chat history:', error);
      throw error;
    }
  }

  /**
   * Get chat history for a session
   * @param {string} sessionId - The chat session ID
   * @param {number} [limit=50] - Maximum number of messages to return
   * @returns {Promise<Array>} - Array of message objects
   */
  async getChatHistory(sessionId, limit = 50) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const key = this._getChatHistoryKey(sessionId);
      const start = -limit;
      const end = -1;
      
      const messages = await this.redis.lrange(key, start, end);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  /**
   * Clear chat history for a session
   * @param {string} sessionId - The chat session ID
   * @returns {Promise<boolean>} - True if successful
   */
  async clearChatHistory(sessionId) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const key = this._getChatHistoryKey(sessionId);
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  /**
   * Get the Redis key for a chat session
   * @private
   */
  _getChatHistoryKey(sessionId) {
    return `chat:${sessionId}:messages`;
  }
}

export default new ChatHistoryService();
