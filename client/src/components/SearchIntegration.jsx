import { useState, useCallback } from 'react';
import useSearch from '../hooks/useSearch';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

const SearchIntegration = ({ onSelectContent }) => {
  const {
    isSearching,
    searchError,
    searchResults,
    selectedResult,
    searchWeb,
    readUrl,
    clearSearch,
    setSelectedResult
  } = useSearch();

  const [isExpanded, setIsExpanded] = useState(false);

  // Handle search submission
  const handleSearch = async (query) => {
    if (!query.trim()) return;
    
    try {
      await searchWeb(query);
      setIsExpanded(true);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle result selection
  const handleSelectResult = useCallback(async (result) => {
    try {
      // If the result already has content, use it directly
      if (result.content) {
        setSelectedResult(result);
      } else {
        // Otherwise, fetch the full content
        const content = await readUrl(result.url);
        setSelectedResult({ ...result, ...content });
      }
    } catch (error) {
      console.error('Error selecting result:', error);
    }
  }, [readUrl, setSelectedResult]);

  // Handle content insertion into chat
  const handleUseInChat = () => {
    if (!selectedResult) return;
    
    const content = {
      title: selectedResult.title || 'Web Search Result',
      url: selectedResult.url,
      snippet: selectedResult.snippet || selectedResult.description || '',
      content: selectedResult.content || '',
      source: 'web_search',
      timestamp: new Date().toISOString()
    };
    
    onSelectContent(content);
    // Clear the search after inserting content
    clearSearch();
    setIsExpanded(false);
  };

  return (
    <div className="mb-4">
      {/* Search Bar */}
      <div className="relative">
        <SearchBar 
          onSearch={handleSearch} 
          onClear={() => {
            clearSearch();
            setIsExpanded(false);
          }}
          isSearching={isSearching}
        />
        
        {/* Toggle button */}
        {searchResults.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {isExpanded ? 'Hide results' : 'Show results'}
            <svg 
              className={`ml-1 w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p>{searchError}</p>
        </div>
      )}

      {/* Search Results */}
      {isExpanded && (searchResults.length > 0 || isSearching) && (
        <div className="mt-4">
          <SearchResults 
            results={searchResults}
            selectedResult={selectedResult}
            onSelectResult={handleSelectResult}
            isSearching={isSearching}
          />
          
          {selectedResult && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleUseInChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                disabled={isSearching}
              >
                Use in Chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchIntegration;
