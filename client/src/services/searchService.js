import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const searchService = {
  /**
   * Search the web using Jina MCP
   * @param {string} query - The search query
   * @param {number} [limit=5] - Maximum number of results to return
   * @returns {Promise<Array>} Search results
   */
  async searchWeb(query, limit = 5) {
    try {
      const response = await axios.post(
        `${API_URL}/api/search/web`,
        { query, limit },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error.response?.data?.error || 'Failed to perform search';
    }
  },

  /**
   * Read content from a URL using Jina MCP
   * @param {string} url - The URL to read content from
   * @returns {Promise<Object>} Extracted content from the URL
   */
  async readUrl(url) {
    try {
      const response = await axios.post(
        `${API_URL}/api/search/read`,
        { url },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('URL read error:', error);
      throw error.response?.data?.error || 'Failed to read URL content';
    }
  },

  /**
   * Perform a web search and read the content of the top result
   * @param {string} query - The search query
   * @returns {Promise<Object>} Content from the top search result
   */
  async searchAndReadTopResult(query) {
    try {
      // First, perform the search
      const results = await this.searchWeb(query, 1);
      
      if (!results || results.length === 0) {
        throw new Error('No results found');
      }
      
      // Then, read the content of the top result
      const topResult = results[0];
      const content = await this.readUrl(topResult.url);
      
      return {
        ...topResult,
        content
      };
    } catch (error) {
      console.error('Search and read error:', error);
      throw error;
    }
  }
};

export default searchService;
