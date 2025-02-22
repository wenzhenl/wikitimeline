import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import logger from "@/app/utils/logger";
import wiki from "wikipedia";

interface SearchResult {
  title: string;
  description: string;
  pageid: number;
  fullurl: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  pageviews: number;
}

interface SelectedPage {
  title: string;
  link: string;
}

interface WikiSearchProps {
  selectedPages: SelectedPage[];
  onPagesChange: (pages: SelectedPage[]) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function WikiSearch({
  selectedPages,
  onPagesChange,
  placeholder,
  className,
  autoFocus = true,
}: WikiSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const extractWikiTitle = (url: string): string | null => {
    try {
      const urlPattern = /(?:https?:\/\/[^\/]+)?\/wiki\/([^#?]+)/;
      const match = url.match(urlPattern);
      if (match) {
        // First decode any existing encoding to get clean title
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch (error) {
      logger.error("Error parsing Wikipedia URL:", error);
      return null;
    }
  };

  const handleInputChange = async (value: string) => {
    setInputValue(value);
    setShowDropdown(true);

    // Check if input looks like a Wikipedia URL
    const wikiTitle = extractWikiTitle(value);
    if (wikiTitle) {
      // If it's a valid Wikipedia URL, add it directly
      const newPage = {
        title: wikiTitle,
        link: `https://en.wikipedia.org/wiki/${wikiTitle.replace(/ /g, "_")}`,
      };

      // Check if page already exists
      if (!selectedPages.some((page) => page.link === newPage.link)) {
        onPagesChange([...selectedPages, newPage]);
        setInputValue("");
        setSearchResults([]);
        return undefined;
      }
    }

    // Continue with existing search logic for non-URL inputs
    if (!value.trim()) {
      setSearchResults([]);
      return undefined;
    }

    // Existing search logic...
    const fetchResults = async () => {
      if (!value.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await wiki.search(value, {
          limit: 10,
          suggestion: true,
        });

        // Convert to our SearchResult format
        const searchResults = await Promise.all(
          results.results.map(async (result) => {
            const summary = await wiki.summary(result.title);
            return {
              title: result.title,
              description: summary.description || summary.extract || "",
              pageid: summary.pageid,
              fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(
                summary.titles.canonical
              )}`,
              thumbnail: summary.thumbnail,
              pageviews: 0, // Note: pageviews not available in this API
            };
          })
        );

        setSearchResults(searchResults);
      } catch (error) {
        logger.error("Error fetching Wikipedia search results:", error);
        setSearchResults([]);
      }
      setIsLoading(false);
    };

    // Debounce the search
    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  };

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

  const handleResultClick = (result: SearchResult) => {
    const newPage = {
      title: result.title, // Store the clean title for display
      link:
        result.fullurl ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
    };

    // Check if page already exists
    if (selectedPages.some((page) => page.link === newPage.link)) {
      return;
    }

    onPagesChange([...selectedPages, newPage]);
    setInputValue("");
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removePage = (indexToRemove: number) => {
    const newPages = selectedPages.filter(
      (_, index) => index !== indexToRemove
    );
    onPagesChange(newPages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, []);

  return (
    <div
      className={`relative ${className}`}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <div
        className="flex flex-wrap gap-2 mb-2"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem", // matches gap-2
          marginBottom: "0.5rem", // matches mb-2
          width: "100%",
        }}
      >
        {selectedPages.map((page, index) => (
          <span
            key={index}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem", // matches gap-1
              padding: "0.5rem 0.25rem", // matches px-2 py-1
              borderRadius: "0.375rem", // matches rounded-md
            }}
          >
            {page.title}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePage(index);
              }}
              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              style={{
                marginLeft: "0.25rem", // matches ml-1
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div
        className="relative"
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search Wikipedia or paste URL..."}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          style={{
            width: "100%",
            padding: "0.5rem 1rem", // matches px-4 py-2
            borderRadius: "0.5rem", // matches rounded-lg
          }}
        />
        {showDropdown && inputValue.trim() && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
            {isLoading ? (
              <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                <p className="mt-2">Searching Wikipedia...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((result, index) => (
                  <li
                    key={result.pageid}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start gap-3 ${
                      index === selectedIndex
                        ? "bg-gray-50 dark:bg-gray-700"
                        : ""
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden bg-gray-100 dark:bg-gray-600">
                      {result.thumbnail ? (
                        <Image
                          src={result.thumbnail.source}
                          alt={result.title}
                          fill
                          unoptimized={true}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                        {result.title}
                      </h4>
                      {result.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
                No results found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
