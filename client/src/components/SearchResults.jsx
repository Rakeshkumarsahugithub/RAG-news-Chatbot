import { FiExternalLink, FiClock, FiCalendar, FiUser } from 'react-icons/fi';

const SearchResults = ({ 
  results, 
  selectedResult, 
  onSelectResult, 
  isSearching 
}) => {
  if (isSearching && (!results || results.length === 0)) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        Searching the web...
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        No results found. Try a different search query.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Search Results List */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                onClick={() => onSelectResult(result)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedResult?.url === result.url 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-blue-700 line-clamp-2">
                    {result.title || 'Untitled'}
                  </h4>
                  <FiExternalLink className="flex-shrink-0 ml-2 text-gray-400" />
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {result.description || result.snippet}
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span className="truncate">
                    {new URL(result.url).hostname.replace('www.', '')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Result Preview */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {selectedResult ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedResult.title || 'No title available'}
                </h3>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <a 
                    href={selectedResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    {new URL(selectedResult.url).hostname.replace('www.', '')}
                    <FiExternalLink className="ml-1" size={12} />
                  </a>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedResult.publishedAt && (
                  <div className="mb-3 text-sm text-gray-500 flex items-center">
                    <FiCalendar className="mr-1.5" />
                    {new Date(selectedResult.publishedAt).toLocaleDateString()}
                    {selectedResult.author && (
                      <>
                        <span className="mx-2">•</span>
                        <FiUser className="mr-1.5" />
                        {selectedResult.author}
                      </>
                    )}
                  </div>
                )}
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedResult.content || selectedResult.snippet || 'No content available.' 
                  }} 
                />
              </div>
              <div className="p-4 border-t bg-gray-50">
                <a
                  href={selectedResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Read full article
                  <FiExternalLink className="ml-1" />
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-gray-500">
              <p>Select a result to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
