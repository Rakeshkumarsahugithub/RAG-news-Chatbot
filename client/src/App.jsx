import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import './App.scss';

// Components
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import LoadingIndicator from './components/LoadingIndicator';
import SearchIntegration from './components/SearchIntegration';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);
  const streamingMessageRef = useRef(''); // Add ref to track streaming message

  // Initialize socket and session
  useEffect(() => {
    initializeChat();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const initializeChat = async () => {
    try {
      // Create session
      const response = await axios.post(`${API_BASE_URL}/api/sessions`);
      const newSessionId = response.data.id;
      setSessionId(newSessionId);

      // Initialize socket
      const newSocket = io(API_BASE_URL, {
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server - Socket ID:', newSocket.id);
        setIsConnected(true);
        console.log('🏠 Joining session:', newSessionId);
        newSocket.emit('join-session', newSessionId);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('chat-response', (data) => {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp,
          sources: data.sources,
          model: data.model,
          contextUsed: data.contextUsed
        }]);
        setIsLoading(false);
        setCurrentStatus('');
      });

      newSocket.on('chat-stream-start', (data) => {
        setStreamingMessage('');
        streamingMessageRef.current = ''; // Reset ref
        setIsLoading(false);
        setCurrentStatus('');
      });

      newSocket.on('chat-stream-chunk', (data) => {
        const newContent = data.chunk;
        streamingMessageRef.current += newContent; // Update ref
        setStreamingMessage(prev => prev + newContent);
      });

      newSocket.on('chat-stream-end', (data) => {
        // Use the ref value which has the complete message
        const completeMessage = streamingMessageRef.current;
        setMessages(prev => [...prev, {
          id: uuidv4(),
          role: 'assistant',
          content: completeMessage,
          timestamp: new Date().toISOString(),
          streaming: true
        }]);
        setStreamingMessage('');
        streamingMessageRef.current = ''; // Reset ref
      });

      newSocket.on('chat-status', (data) => {
        setCurrentStatus(data.status);
        if (data.status === 'thinking') {
          setIsLoading(true);
        } else if (data.status === 'complete' || data.status === 'error') {
          setIsLoading(false);
          setIsProcessing(false);
        }
      });

      newSocket.on('session-reset', () => {
        setMessages([]);
        setStreamingMessage('');
        setCurrentStatus('');
        setIsLoading(false);
        setIsProcessing(false);
      });

      newSocket.on('user-typing', (data) => {
        setIsTyping(data.isTyping);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setCurrentStatus('Error occurred');
        setIsLoading(false);
        setIsProcessing(false);
      });

      setSocket(newSocket);

      // Load chat history
      loadChatHistory(newSessionId);

    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const loadChatHistory = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/history/${sessionId}`);
      const history = response.data.history;
      
      const formattedMessages = history.map(msg => ({
        id: uuidv4(),
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        sources: msg.sources || [],
        contextUsed: msg.contextUsed || 0
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = (message) => {
    if (!socket || !sessionId || !message.trim()) {
      console.log('❌ SendMessage blocked:', { socket: !!socket, sessionId, message: message?.trim() });
      return;
    }

    console.log('📤 Sending message:', { message: message.trim(), sessionId, isConnected });

    // Add user message to UI immediately
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsProcessing(true);
    setCurrentStatus('thinking');

    // Send via socket for streaming response
    console.log('🔌 Emitting chat-message-stream event:', {
      message: message.trim(),
      sessionId: sessionId
    });
    
    socket.emit('chat-message-stream', {
      message: message.trim(),
      sessionId: sessionId
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset the current chat session
  const resetSession = useCallback(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setMessages([
      {
        id: 'welcome',
        content: 'Hello! I\'m your AI assistant. How can I help you today?',
        sender: 'ai',
        timestamp: new Date().toISOString()
      }
    ]);
    setStreamingMessage('');
  }, []);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((content) => {
    // Add the search result as a user message
    const searchMessage = {
      id: `search-${Date.now()}`,
      type: 'search_result',
      content: content,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, searchMessage]);
    
    // Optionally, you can automatically send the search result to the AI
    // sendMessage(`Here's what I found about "${content.title}":\n\n${content.snippet}\n\n[Read more](${content.url})`);
  }, []);

  return (
    <div className="app">
      <ChatHeader 
        sessionId={sessionId} 
        isConnected={isConnected}
        currentStatus={currentStatus}
        onReset={resetSession}
      />
      
      <main className="chat-container">
        <div className="messages-wrapper">
          <MessageList 
            messages={messages} 
            streamingMessage={streamingMessage} 
            isLoading={isLoading}
            currentStatus={currentStatus}
            isTyping={isTyping}
          />
          <div ref={messagesEndRef} />
        </div>
      </main>
      
      <MessageInput 
        onSendMessage={sendMessage}
        disabled={!isConnected || isLoading}
        isProcessing={isProcessing}
        onSearchToggle={() => setShowSearch(!showSearch)}
        isSearchVisible={showSearch}
      />
      
      {showSearch && (
        <SearchIntegration 
          onSelect={handleSearchResultSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
      
      {isLoading && <LoadingIndicator />}
    </div>
  );
}

export default App;