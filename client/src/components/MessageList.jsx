import React, { memo } from 'react';
import './MessageList.scss';

const Message = memo(({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="message-role">{message.role}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-content">
        {message.content}
      </div>
      {message.role === 'assistant' && (
        <div className="message-footer">
          {message.model && (
            <div className="message-meta">
              <span>Model: {message.model}</span>
            </div>
          )}
          {message.contextUsed !== undefined && (
            <div className="message-meta">
              <span>Context: {message.contextUsed} articles</span>
            </div>
          )}
          {message.sources && message.sources.length > 0 && (
            <div className="message-meta">
              <span>Sources: {message.sources.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Message.displayName = 'Message';

const MessageList = memo(({ 
  messages, 
  streamingMessage, 
  isLoading, 
  currentStatus, 
  isTyping 
}) => {
  return (
    <>
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      {streamingMessage && (
        <div className="streaming-message">
          {streamingMessage}
        </div>
      )}
      
      {isLoading && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="typing-text">AI is thinking...</span>
        </div>
      )}
      
      {messages.length === 0 && !streamingMessage && !isLoading && (
        <div className="welcome-message">
          <h2>Welcome to the RAG News Chatbot! 🤖📰</h2>
          <p>Ask me anything about recent news articles. I can help you:</p>
          <ul>
            <li>Find information about specific topics</li>
            <li>Summarize news events</li>
            <li>Compare different perspectives</li>
            <li>Answer questions about current events</li>
          </ul>
          <p>Try asking: "What's happening in the world today?" or "Tell me about recent technology news"</p>
        </div>
      )}
    </>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;