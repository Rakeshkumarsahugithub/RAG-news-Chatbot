import React, { memo } from 'react';
import './ChatHeader.scss';

const ChatHeader = memo(({
  isConnected, 
  sessionId, 
  onReset
}) => {
  return (
    <div className="chat-header">
      <div className="header-left">
        <h1>RAG News Chatbot</h1>
        <div className="connection-status">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {sessionId && (
          <div className="session-info">
            <span>Session: {sessionId.slice(-8)}</span>
          </div>
        )}
      </div>
      <div className="header-right">
        <button 
          className="header-button" 
          onClick={onReset}
          disabled={!isConnected}
          title="Reset conversation"
        >
          Reset
        </button>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;