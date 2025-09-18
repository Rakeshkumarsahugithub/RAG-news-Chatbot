// import React, { memo } from 'react';

// const SourcesPanel = memo(({ sources, onClose }) => {
//   const formatDate = (dateString) => {
//     if (!dateString) return 'Unknown date';
//     return new Date(dateString).toLocaleDateString([], {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   const formatScore = (score) => {
//     return (score * 100).toFixed(1) + '%';
//   };

//   return (
//     <div className="sources-panel">
//       <div className="sources-header">
//         <h3>Sources ({sources.length})</h3>
//         <button className="close-button" onClick={onClose} title="Close sources">
//           ✕
//         </button>
//       </div>
      
//       <div className="sources-list">
//         {sources.length > 0 ? (
//           sources.map((source, index) => (
//             <div key={index} className="source-item">
//               <div className="source-title">
//                 {source.title || 'Untitled Article'}
//               </div>
              
//               <div className="source-meta">
//                 <div>
//                   <strong>Source:</strong> {source.source || 'Unknown'}
//                 </div>
//                 <div>
//                   <strong>Date:</strong> {formatDate(source.publishDate)}
//                 </div>
//                 {source.relevanceScore !== undefined && (
//                   <div className="source-score">
//                     Relevance: {formatScore(source.relevanceScore)}
//                   </div>
//                 )}
//               </div>
              
//               {source.url && (
//                 <a 
//                   href={source.url} 
//                   target="_blank" 
//                   rel="noopener noreferrer"
//                   title="Open article in new tab"
//                 >
//                   Read full article →
//                 </a>
//               )}
//             </div>
//           ))
//         ) : (
//           <div className="no-sources">
//             No sources available for the current conversation.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// });

// SourcesPanel.displayName = 'SourcesPanel';

// export default SourcesPanel;

import React, { memo } from 'react';

const SourcesPanel = memo(({ sources, onClose }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    // If date is in the future (shouldn't happen, but just in case)
    if (diffInMs < 0) {
      return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // For recent dates
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
      }
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    }
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    // For older dates, show full date
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatScore = (score) => {
    return (score * 100).toFixed(1) + '%';
  };

  return (
    <div className="sources-panel">
      <div className="sources-header">
        <h3>Sources ({sources.length})</h3>
        <button className="close-button" onClick={onClose} title="Close sources">
          ✕
        </button>
      </div>
      
      <div className="sources-list">
        {sources.length > 0 ? (
          sources.map((source, index) => (
            <div key={index} className="source-item">
              <div className="source-title">
                {source.title || 'Untitled Article'}
              </div>
              
              <div className="source-meta">
                <div>
                  <strong>Source:</strong> {source.source || 'Unknown'}
                </div>
                <div>
                  <strong>Date:</strong> {formatDate(source.publishDate)}
                </div>
                {source.relevanceScore !== undefined && (
                  <div className="source-score">
                    <strong>Relevance:</strong> {formatScore(source.relevanceScore)}
                  </div>
                )}
              </div>
              
              {source.url && (
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="read-more"
                  title="Open article in new tab"
                >
                  Read full article →
                </a>
              )}
            </div>
          ))
        ) : (
          <div className="no-sources">
            No sources available for the current conversation.
          </div>
        )}
      </div>
    </div>
  );
});

SourcesPanel.displayName = 'SourcesPanel';

export default SourcesPanel;