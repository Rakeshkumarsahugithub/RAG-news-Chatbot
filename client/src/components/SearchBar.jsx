import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiX, FiExternalLink } from 'react-icons/fi';

const SearchBar = ({ onSearch, onClear, isSearching }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web..."
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          disabled={isSearching}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-12 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <FiX className="h-5 w-5" />
          </button>
        )}
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className={`absolute inset-y-0 right-0 px-4 flex items-center rounded-r-lg ${
            !query.trim() || isSearching
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } transition`}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
