import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

// Enable CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());

// Simple routes for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'RAG Chatbot Test Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    components: {
      server: 'running',
      websocket: 'enabled'
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/session/create', (req, res) => {
  const sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  res.status(201).json({
    id: sessionId,
    createdAt: new Date().toISOString(),
    status: 'active'
  });
});

app.post('/api/chat/message', (req, res) => {
  const { message, sessionId } = req.body;
  
  res.json({
    query: message,
    response: `This is a test response to: "${message}". The RAG system is running in test mode.`,
    model: 'test-mode',
    sources: [],
    contextUsed: 0,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  });
});

// Add chat history endpoint
app.get('/api/chat/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Return empty history for test mode
  res.json({
    sessionId: sessionId,
    history: [],
    count: 0,
    timestamp: new Date().toISOString()
  });
});

// Add session reset endpoint
app.post('/api/session/:sessionId/reset', (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`🔄 Session reset requested: ${sessionId}`);
  
  res.json({
    sessionId: sessionId,
    status: 'reset',
    message: 'Session reset successfully',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO for testing
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`📱 Socket ${socket.id} joined session: ${sessionId}`);
  });

  socket.on('chat-message', async (data) => {
    const { message, sessionId } = data;
    
    console.log(`💬 Message: ${message}`);
    
    // Simulate processing delay
    socket.emit('chat-status', { status: 'thinking', sessionId });
    
    setTimeout(() => {
      socket.emit('chat-response', {
        response: `Test response to: "${message}". The system is working!`,
        sources: [],
        contextUsed: 0,
        model: 'test-mode',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('chat-status', { status: 'complete', sessionId });
    }, 1000);
  });

  socket.on('chat-message-stream', async (data) => {
    console.log('📨 RECEIVED chat-message-stream event:', {
      message: data.message,
      sessionId: data.sessionId,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    const { message, sessionId } = data;
    
    socket.emit('chat-status', { status: 'thinking', sessionId });
    
    setTimeout(() => {
      socket.emit('chat-stream-start', {
        sources: [],
        contextUsed: 0,
        sessionId: sessionId
      });
      
      const response = `Test streaming response to: "${message}". This demonstrates the streaming capability!`;
      const chunks = response.split(' ');
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < chunks.length) {
          socket.emit('chat-stream-chunk', { 
            chunk: chunks[index] + ' ',
            sessionId: sessionId 
          });
          index++;
        } else {
          clearInterval(interval);
          socket.emit('chat-stream-end', { sessionId });
          socket.emit('chat-status', { status: 'complete', sessionId });
        }
      }, 100);
    }, 500);
  });

  socket.on('reset-session', (data) => {
    socket.emit('session-reset', { 
      sessionId: data.sessionId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const port = process.env.PORT || 3001;

// Function to find available port
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, (err) => {
      if (err) {
        server.close();
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️  Port ${startPort} is busy, trying ${startPort + 1}...`);
          findAvailablePort(startPort + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      } else {
        const actualPort = server.address().port;
        server.close(() => {
          resolve(actualPort);
        });
      }
    });
  });
}

// Start server with available port
findAvailablePort(port).then((availablePort) => {
  server.listen(availablePort, () => {
    console.log(`🎉 Test server running on port ${availablePort}`);
    console.log(`📱 Socket.IO server ready`);
    console.log(`🌐 API available at: http://localhost:${availablePort}`);
    console.log(`📊 Health check: http://localhost:${availablePort}/api/health`);
    
    // Update frontend environment if needed
    if (availablePort !== 3001) {
      console.log(`\n⚠️  NOTE: Server is running on port ${availablePort} instead of 3001`);
      console.log(`   Make sure your frontend connects to: http://localhost:${availablePort}`);
    }
  });
}).catch((err) => {
  console.error('❌ Failed to find available port:', err);
  process.exit(1);
});