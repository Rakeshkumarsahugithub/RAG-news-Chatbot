import React, { useState, useEffect, useRef, memo } from 'react';
import './MessageInput.scss';

const MessageInput = memo(({ onSendMessage, disabled, onTyping, isProcessing }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      handleTypingEnd();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    handleTypingStart();
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingEnd();
    }, 1000);
  };

  const handleTypingEnd = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping?.(false);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="message-input">
      <form onSubmit={handleSubmit} className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Connecting..." : "Type your message... (Shift+Enter for new line)"}
            disabled={disabled}
            rows={1}
            maxLength={1000}
          />
          <div className="input-hint">
            {message.length}/1000 characters
          </div>
        </div>
        <button 
          type="submit" 
          className={`send-button ${isProcessing ? 'processing' : ''} ${disabled || !message.trim() ? 'disabled' : ''}`}
          disabled={disabled || !message.trim() || isProcessing}
        >
          <span className="button-content">
            {isProcessing ? (
              <>
                <div className="spinner"></div>
                <span>Processing...</span>
              </>
            ) : disabled ? (
              <>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6"></path>
                  <path d="m21 12-6 0m-6 0-6 0"></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="icon send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9"></polygon>
                </svg>
                <span>Send</span>
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;