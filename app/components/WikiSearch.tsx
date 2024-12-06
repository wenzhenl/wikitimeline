import { useState, useEffect, useRef } from "react";

interface SearchResult {
  title: string;
  description: string;
  pageid: number;
}

interface WikiSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (wikiLink: string) => void;
  placeholder?: string;
  className?: string;
}

export default function WikiSearch({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: WikiSearchProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!value.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?` +
            `action=query&format=json&origin=*&` +
            `generator=search&gsrnamespace=0&gsrlimit=5&` +
            `prop=extracts|description&exintro=1&explaintext=1&` +
            `gsrsearch=${encodeURIComponent(value)}`
        );

        const data = await response.json();

        if (data.query && data.query.pages) {
          const results = Object.values(data.query.pages).map((page: any) => ({
            title: page.title,
            description: page.description || page.extract || "",
            pageid: page.pageid,
          }));
          setSearchResults(results as SearchResult[]);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error fetching Wikipedia search results:", error);
        setSearchResults([]);
      }
      setIsLoading(false);
    };

    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (title: string) => {
    const wikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      title
    )}`;
    onSelect(wikiLink);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
      />

      {showDropdown && value.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          {isLoading ? (
            <div className="p-2 text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : searchResults.length > 0 ? (
            <ul>
              {searchResults.map((result) => (
                <li
                  key={result.pageid}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleResultClick(result.title)}
                >
                  <div className="font-medium">{result.title}</div>
                  {result.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {result.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-2 text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
