import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';

// Import routes
import chatRoutes from './routes/chat.js';
import sessionRoutes from './routes/session.js';
import healthRoutes from './routes/health.js';
import searchRoutes from './routes/search.js';

// Import services
import RAGService from './services/ragService.js';
import jinaMCPService from './services/jinaMCPService.js';

// Initialize services
const ragService = new RAGService();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make ragService and jinaMCPService available to routes
app.locals.ragService = ragService;
app.locals.jinaMCPService = jinaMCPService;

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/search', searchRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'RAG Chatbot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      session: '/api/session'
    }
  });
});

// Socket.IO handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join session room
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`📱 Socket ${socket.id} joined session: ${sessionId}`);
  });

  // Handle chat messages
  socket.on('chat-message', async (data) => {
    try {
      const { message, sessionId } = data;
      
      if (!message || !sessionId) {
        socket.emit('error', { message: 'Message and sessionId are required' });
        return;
      }

      console.log(`💬 Chat message from ${socket.id}: ${message.substring(0, 50)}...`);

      // Store user message in history
      await ragService.addMessageToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Emit thinking status
      socket.emit('chat-status', { status: 'thinking', sessionId });

      // Process the query using RAG service
      const response = await ragService.processQuery(message, sessionId);

      // Store assistant response in history
      await ragService.addMessageToHistory(sessionId, {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        contextUsed: response.contextUsed,
        model: response.model,
        timestamp: response.timestamp
      });

      // Emit the response
      socket.emit('chat-response', {
        response: response.response,
        sources: response.sources,
        contextUsed: response.contextUsed,
        model: response.model,
        sessionId: sessionId,
        timestamp: response.timestamp
      });

      // Emit completion status
      socket.emit('chat-status', { status: 'complete', sessionId });

    } catch (error) {
      console.error('❌ Socket chat error:', error);
      socket.emit('error', { 
        message: 'Failed to process message',
        error: error.message 
      });
      socket.emit('chat-status', { status: 'error', sessionId: data.sessionId });
    }
  });

  // Handle streaming chat messages
  socket.on('chat-message-stream', async (data) => {
    let sessionId;
    
    try {
      const { message, sessionId: sid } = data;
      sessionId = sid;
      
      if (!message || !sessionId) {
        socket.emit('error', { message: 'Message and sessionId are required' });
        return;
      }

      console.log(`🌊 Streaming chat from ${socket.id}: ${message.substring(0, 50)}...`);

      // Store user message in history
      await ragService.addMessageToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Emit thinking status
      socket.emit('chat-status', { status: 'thinking', sessionId });

      try {
        // Generate streaming response
        const streamResult = await ragService.generateStreamingResponse(message, sessionId);
        
        socket.emit('chat-stream-start', {
          sources: streamResult.sources,
          contextUsed: streamResult.contextUsed,
          sessionId: sessionId
        });

        // Stream chunks
        const chunks = [];
        for (const chunk of streamResult.chunks) {
          chunks.push(chunk);
          socket.emit('chat-stream-chunk', { 
            chunk: chunk,
            sessionId: sessionId 
          });
          
          // Small delay between chunks for better UX
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Store the complete response in chat history
        const completeResponse = chunks.join('');
        await ragService.addMessageToHistory(sessionId, {
          role: 'assistant',
          content: completeResponse,
          sources: streamResult.sources,
          contextUsed: streamResult.contextUsed,
          timestamp: new Date().toISOString()
        });

        socket.emit('chat-stream-end', { sessionId });

      } catch (streamError) {
        console.error('❌ Streaming error, falling back to regular response:', streamError);
        
        // Fallback to regular response
        const response = await ragService.processQuery(message, sessionId);
        
        // Store the fallback response in history
        await ragService.addMessageToHistory(sessionId, {
          role: 'assistant',
          content: response.response,
          sources: response.sources,
          contextUsed: response.contextUsed,
          timestamp: response.timestamp,
          fallback: true
        });
        
        socket.emit('chat-response', {
          response: response.response,
          sources: response.sources,
          contextUsed: response.contextUsed,
          model: response.model,
          sessionId: sessionId,
          timestamp: response.timestamp,
          fallback: true
        });
      }

      socket.emit('chat-status', { status: 'complete', sessionId });

    } catch (error) {
      console.error('❌ Socket streaming error:', error);
      socket.emit('error', { 
        message: 'Failed to process streaming message',
        error: error.message 
      });
      socket.emit('chat-status', { status: 'error', sessionId: data.sessionId });
    }
  });

  // Handle session reset
  socket.on('reset-session', async (data) => {
    try {
      const { sessionId } = data;
      
      if (!sessionId) {
        socket.emit('error', { message: 'SessionId is required' });
        return;
      }

      await ragService.clearChatHistory(sessionId);
      
      socket.emit('session-reset', { 
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });

      console.log(`🔄 Session reset: ${sessionId}`);

    } catch (error) {
      console.error('❌ Session reset error:', error);
      socket.emit('error', { 
        message: 'Failed to reset session',
        error: error.message 
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(data.sessionId).emit('user-typing', {
      sessionId: data.sessionId,
      isTyping: data.isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Initializing RAG chatbot server...');
    
    // Initialize RAG service
    await ragService.initialize();
    
    const port = config.server.port;
    
    server.listen(port, () => {
      console.log(`\n🎉 RAG Chatbot server running on port ${port}`);
      console.log(`📱 Socket.IO server ready for connections`);
      console.log(`🌐 API available at: http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/api/health`);
      console.log(`\n⚙️  Environment: ${config.server.nodeEnv}`);
      
      if (config.server.nodeEnv === 'development') {
        console.log(`\n🔧 Development mode:`);
        console.log(`   - CORS enabled for localhost:3000 and localhost:5173`);
        console.log(`   - Rate limiting: 100 requests per 15 minutes`);
        console.log(`   - Detailed error messages enabled`);
      }
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use!`);
        console.log('\n🔍 Trying to find and kill process using this port...');
        
        // Try to kill the process using this port
        const { exec } = require('child_process');
        exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
          if (stdout) {
            console.log('Processes using port:', stdout);
            console.log('⚠️  Please manually kill the process or use a different port.');
            console.log(`   Try: taskkill /F /PID <PID_NUMBER>`);
          } else {
            console.log('🔁 Retrying in 5 seconds...');
            setTimeout(() => startServer(), 5000);
          }
        });
      } else {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    // Close socket connections
    io.close();
    
    // Disconnect from Redis
    await ragService.redisClient.disconnect();
    
    console.log('✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    io.close();
    await ragService.redisClient.disconnect();
    console.log('✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

export { app, io, ragService };