import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class JinaMCPService {
  constructor() {
    this.baseUrl = 'https://mcp.jina.ai';
    this.apiKey = process.env.JINA_API_KEY;
    this.sessionId = `session-${uuidv4()}`;
    this.updateHeaders();
  }

  updateHeaders() {
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': this.sessionId,
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };
  }

  async makeRequest(method, params) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/mcp`,
        {
          jsonrpc: '2.0',
          method,
          params,
          id: uuidv4()
        },
        { 
          headers: this.headers,
          timeout: 30000
        }
      );
      
      if (response.data.error) {
        throw new Error(`Jina MCP error: ${response.data.error.message || 'Unknown error'}`);
      }
      
      return response.data.result;
    } catch (error) {
      if (error.response?.data?.error?.code === -32001) { // Session expired
        // Reset session ID and retry once
        this.sessionId = `session-${uuidv4()}`;
        this.updateHeaders();
        return this.makeRequest(method, params);
      }
      throw error;
    }
  }

  async searchWeb(query, limit = 5) {
    try {
      return await this.makeRequest('search_web', {
        query,
        limit,
        search_type: 'web',
        return_documents: true
      }) || [];
    } catch (error) {
      console.error('Jina MCP search_web error:', error.message);
      throw error;
    }
  }

  async readUrl(url) {
    try {
      return await this.makeRequest('read_url', {
        url,
        extract_metadata: true,
        extract_text: true
      });
    } catch (error) {
      console.error('Jina MCP read_url error:', error.message);
      throw error;
    }
  }

  async parallelSearchWeb(queries, limit = 3) {
    try {
      // Since the API might not support parallel search directly,
      // we'll implement it using Promise.all for concurrent searches
      const searchPromises = queries.map(query => 
        this.searchWeb(query, limit)
          .catch(error => {
            console.error(`Error in parallel search for query "${query}":`, error.message);
            return []; // Return empty array for failed searches
          })
      );
      
      const results = await Promise.all(searchPromises);
      
      // Combine results into a single object with query as key
      return queries.reduce((acc, query, index) => {
        acc[query] = results[index] || [];
        return acc;
      }, {});
    } catch (error) {
      console.error('Jina MCP parallel_search_web error:', error.message);
      throw error;
    }
  }
}

export default new JinaMCPService();
