import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

class GeminiService {
  constructor() {
    this.apiKey = config.apis.geminiApiKey;
    this.genAI = null;
    this.model = null;
    this.modelName = 'gemini-1.5-flash'; // Available model
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured');
      }

      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('✅ Gemini API service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Gemini service:', error.message);
      
      // Initialize fallback mode
      this.initializeFallback();
    }
  }

  async testConnection() {
    try {
      const prompt = "Hello, this is a test message. Please respond with 'Test successful'.";
      
      // Add retry logic for 503 errors
      let retries = 3;
      while (retries > 0) {
        try {
          const result = await this.model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          if (text && text.length > 0) {
            console.log('✅ Gemini API test successful');
            return true;
          } else {
            throw new Error('Empty response from Gemini API');
          }
        } catch (retryError) {
          if (retryError.message.includes('503') && retries > 1) {
            console.log(`⏳ Gemini API overloaded, retrying in 5 seconds... (${retries-1} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            retries--;
            continue;
          }
          throw retryError;
        }
      }
    } catch (error) {
      console.error('❌ Gemini API test failed:', error.message);
      throw error;
    }
  }

  initializeFallback() {
    console.log('🔄 Initializing fallback response generator...');
    this.model = null;
    this.isInitialized = true;
    console.log('✅ Fallback response generator initialized');
  }

  async generateResponse(query, context, conversationHistory = []) {
    if (!this.isInitialized) {
      throw new Error('Gemini service not initialized');
    }

    try {
      if (this.model) {
        // Use Gemini API
        return await this.generateGeminiResponse(query, context, conversationHistory);
      } else {
        // Use fallback response
        return this.generateFallbackResponse(query, context);
      }
    } catch (error) {
      console.error('❌ Error generating response:', error.message);
      
      // Fallback to simple response on API failure
      return this.generateFallbackResponse(query, context);
    }
  }

  async generateGeminiResponse(query, context, conversationHistory) {
    const prompt = this.constructPrompt(query, context, conversationHistory);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        response: text,
        model: 'gemini-pro',
        tokensUsed: this.estimateTokens(prompt + text),
        context: context.slice(0, 3), // Include top 3 context items for transparency
      };
    } catch (error) {
      console.error('❌ Gemini API error:', error.message);
      throw error;
    }
  }

  generateFallbackResponse(query, context) {
    console.log('🔄 Using enhanced fallback response generator');
    
    let response = `News Summary: ${query}\n\n`;
    
    if (context && context.length > 0) {
      response += `I found ${context.length} relevant articles. Here's a detailed summary:\n\n`;
      
      // Group articles by source for better organization
      const articlesBySource = context.reduce((acc, item) => {
        const source = item.payload?.source || 'Other Sources';
        if (!acc[source]) acc[source] = [];
        acc[source].push(item);
        return acc;
      }, {});
      
      // Generate structured response without markdown
      Object.entries(articlesBySource).forEach(([source, articles]) => {
        response += `${source.toUpperCase()}\n\n`;
        
        articles.forEach((item, index) => {
          const title = item.payload?.articleTitle || 'Untitled Article';
          const publishDate = item.payload?.publishDate ? 
            new Date(item.payload.publishDate).toLocaleDateString() : 'Recent';
          const url = item.payload?.url || item.payload?.link || '';
          
          // Extract key sentences (first 3 sentences or first 50 words)
          const text = item.payload?.text || '';
          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '');
          
          response += `${index + 1}. ${title}\n`;
          response += `Date: ${publishDate} | Relevance: ${(item.score || 0).toFixed(3)}\n\n`;
          response += `${summary}\n`;
          if (url) response += `Read more: ${url}\n`;
          response += '\n';
        });
      });
      
      response += '---\n';
      response += `Note: This is a fallback response. For more comprehensive analysis, please ensure the Gemini API is properly configured.\n`;
      response += `Your question was: "${query}"`;
      
    } else {
      response = `I couldn't find any information about "${query}" in the current news database.\n\n`;
      response += 'This could be because:\n';
      response += '- The topic is too recent and not yet in our database\n';
      response += '- The search terms were too specific\n';
      response += '- The news articles need to be re-ingested\n\n';
      response += 'Please try rephrasing your question or checking back later for updates.';
    }
    
    return {
      response: response,
      model: 'fallback-enhanced',
      tokensUsed: 0,
      context: context.slice(0, 5), // Include more context in fallback
    };
  }

  constructPrompt(query, context, conversationHistory = []) {
    let prompt = `You are a news analyst assistant. Provide clear, factual responses based on the news context provided. Follow these guidelines:

RESPONSE FORMAT:
- Write in plain text without markdown formatting
- Do not use ** or *** for bold/italic text
- Do not use # for headers
- Use simple paragraph breaks and bullet points with -
- Keep responses conversational and natural

CONTENT GUIDELINES:
- Use only information from the provided context
- If context is insufficient, clearly state what information is missing
- Always cite sources in the format: "According to [Source]..."
- Include relevant dates, locations, and key figures
- Present information clearly without excessive formatting
- If asked about recent events, acknowledge the latest available information
- For complex topics, break down the information into clear sections
- Use bullet points or numbered lists when appropriate
- If multiple articles cover the same event, synthesize the information
- Highlight any conflicting reports or uncertainties

TONE AND STYLE:
- Professional but approachable
- Objective and neutral
- Clear and concise language
- Avoid jargon unless explained
- Vary sentence structure for readability

`;

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += "CONVERSATION HISTORY (Last 6 messages for context):\n";
      conversationHistory.slice(-6).forEach((msg, i) => {
        const speaker = msg.role === 'user' ? 'HUMAN' : 'ASSISTANT';
        prompt += `[${i + 1}] ${speaker}: ${msg.content}\n`;
      });
      prompt += "\n";
    }

    // Add context from retrieved documents with better formatting
    if (context && context.length > 0) {
      prompt += "RELEVANT NEWS CONTEXT (sorted by relevance):\n\n";
      context.forEach((item, index) => {
        const text = item.payload?.text || '';
        const title = item.payload?.articleTitle || 'Untitled';
        const source = item.payload?.source || 'Unknown Source';
        const publishDate = item.payload?.publishDate ? new Date(item.payload.publishDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Date not available';
        const url = item.payload?.url || item.payload?.link || '';
        const category = item.payload?.category || 'General';
        
        prompt += `--- ARTICLE ${index + 1} ---\n`;
        prompt += `📰 TITLE: ${title}\n`;
        prompt += `🏢 SOURCE: ${source} (${category})\n`;
        prompt += `📅 PUBLISHED: ${publishDate}\n`;
        if (url) prompt += `🔗 URL: ${url}\n`;
        prompt += `📊 RELEVANCE: ${(item.score || 0).toFixed(3)}\n`;
        prompt += `\nCONTENT:\n${text}\n\n`;
      });
    } else {
      prompt += "⚠️ No relevant context found in the news database.\n\n";
    }

    prompt += `\n---\n`;
    prompt += `📌 QUESTION: ${query}\n\n`;
    prompt += `💡 Please provide a comprehensive response based on the above context. `;
    prompt += `Structure your answer with clear sections, include specific details, and cite sources.\n\n`;
    prompt += `ASSISTANT'S RESPONSE:`;

    return prompt;
  }

  // Streaming response support (for future implementation)
  async generateStreamingResponse(query, context, conversationHistory = []) {
    if (!this.model) {
      // Return fallback as single chunk
      const fallback = this.generateFallbackResponse(query, context);
      return [fallback.response];
    }

    try {
      const prompt = this.constructPrompt(query, context, conversationHistory);
      const result = await this.model.generateContentStream(prompt);
      
      const chunks = [];
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          chunks.push(chunkText);
        }
      }
      
      return chunks;
    } catch (error) {
      console.error('❌ Streaming error, falling back to regular response:', error.message);
      
      // Fallback to regular response
      const response = await this.generateResponse(query, context, conversationHistory);
      return [response.response];
    }
  }

  // Utility methods
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  async healthCheck() {
    try {
      if (this.model) {
        await this.testConnection();
        return {
          status: 'healthy',
          service: 'gemini-pro',
          apiKey: this.apiKey ? 'configured' : 'missing',
        };
      } else {
        return {
          status: 'fallback',
          service: 'fallback-generator',
          apiKey: 'not-required',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        service: 'gemini-pro',
      };
    }
  }

  // Safety and content filtering
  isSafeQuery(query) {
    const unsafePatterns = [
      /hack/i,
      /exploit/i,
      /password/i,
      /malware/i,
      /virus/i,
    ];
    
    return !unsafePatterns.some(pattern => pattern.test(query));
  }

  sanitizeResponse(response) {
    // Remove potential sensitive information
    return response
      .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[REDACTED]') // Credit card patterns
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]') // SSN patterns
      .replace(/password:\s*\S+/gi, 'password: [REDACTED]'); // Password patterns
  }

  // Configuration methods
  updateApiKey(newApiKey) {
    this.apiKey = newApiKey;
    this.isInitialized = false;
    return this.initialize();
  }

  getConfig() {
    return {
      modelName: this.modelName,
      isInitialized: this.isInitialized,
      hasApiKey: !!this.apiKey,
      mode: this.model ? 'gemini' : 'fallback',
    };
  }
}

export default GeminiService;