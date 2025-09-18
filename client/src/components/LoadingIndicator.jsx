import React, { memo } from 'react';

const LoadingIndicator = memo(({ status }) => {
  const getStatusText = () => {
    switch (status) {
      case 'thinking':
        return 'Thinking...';
      case 'searching':
        return 'Searching articles...';
      case 'generating':
        return 'Generating response...';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="loading-indicator">
      <div className="loading-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <span>{getStatusText()}</span>
    </div>
  );
});

LoadingIndicator.displayName = 'LoadingIndicator';

export default LoadingIndicator;