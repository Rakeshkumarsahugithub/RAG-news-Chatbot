import { useState } from 'react';
import searchService from '../services/searchService';

const useSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  /**
   * Perform a web search
   * @param {string} query - The search query
   * @param {number} [limit=5] - Maximum number of results to return
   */
  const searchWeb = async (query, limit = 5) => {
    if (!query.trim()) {
      setSearchError('Search query cannot be empty');
      return [];
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      const results = await searchService.searchWeb(query, limit);
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error.message || 'Failed to perform search');
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Read content from a URL
   * @param {string} url - The URL to read content from
   */
  const readUrl = async (url) => {
    if (!url) {
      setSearchError('URL is required');
      return null;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      const content = await searchService.readUrl(url);
      setSelectedResult(content);
      return content;
    } catch (error) {
      console.error('URL read error:', error);
      setSearchError(error.message || 'Failed to read URL content');
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Clear search results and errors
   */
  const clearSearch = () => {
    setSearchResults([]);
    setSelectedResult(null);
    setSearchError(null);
  };

  return {
    // State
    isSearching,
    searchError,
    searchResults,
    selectedResult,
    
    // Actions
    searchWeb,
    readUrl,
    clearSearch,
    setSelectedResult,
  };
};

export default useSearch;
