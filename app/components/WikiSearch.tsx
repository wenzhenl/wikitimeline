import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import logger from "@/app/utils/logger";
import wiki from "wikipedia";

// Common language options for Wikipedia
const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
];

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
  language?: string; // Optional language from the search result
}

interface SelectedPage {
  title: string;
  link: string;
  language: string; // Language code (e.g., "en", "fr", "de")
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
  onSubmit,
  placeholder,
  className,
  autoFocus = true,
}: WikiSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default placeholder that mentions language capabilities
  const defaultPlaceholder =
    "Search Wikipedia or paste URL (e.g., Albert Einstein, fr:Marie Curie)";

  // Function to extract wiki title and language from URL
  const extractWikiTitle = (
    url: string
  ): { title: string; language: string } | null => {
    // Try to parse the URL
    try {
      const urlObj = new URL(url);
      // Extract language from subdomain (e.g., "en" from "en.wikipedia.org")
      const hostParts = urlObj.hostname.split(".");
      const langCode = hostParts[0] === "www" ? "en" : hostParts[0];

      // Check if it's a Wikipedia URL
      if (urlObj.hostname.includes("wikipedia.org")) {
        // Get the path parts
        const pathParts = urlObj.pathname.split("/");
        // Find the title part (usually after /wiki/)
        const wikiIndex = pathParts.findIndex((part) => part === "wiki");
        if (wikiIndex >= 0 && wikiIndex < pathParts.length - 1) {
          return {
            title: decodeURIComponent(
              pathParts[wikiIndex + 1].replace(/_/g, " ")
            ),
            language: langCode,
          };
        }
      }
    } catch (e) {
      // Invalid URL, continue with title detection
    }
    return null;
  };

  const handleInputChange = async (value: string) => {
    setInputValue(value);
    setShowResults(true);

    // Check if input looks like a Wikipedia URL
    if (value.includes("wikipedia.org") || value.includes("/wiki/")) {
      const wikiTitle = extractWikiTitle(value);
      if (wikiTitle) {
        // If it's a valid Wikipedia URL, add it directly
        const newPage = {
          title: wikiTitle.title,
          link: `https://${
            wikiTitle.language
          }.wikipedia.org/wiki/${wikiTitle.title.replace(/ /g, "_")}`,
          language: wikiTitle.language,
        };

        onPagesChange([...selectedPages, newPage]);
        setInputValue("");
        return;
      }
    }

    // Debounced search logic
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        fetchResults();
      } else {
        setSearchResults([]);
      }
    }, 300);

    // Cleanup timeout on next input change
    return () => clearTimeout(timeoutId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    // Check if page is already selected to avoid duplicates
    const isAlreadySelected = selectedPages.some(
      (page) => page.title === result.title
    );

    if (!isAlreadySelected) {
      const newPage = {
        title: result.title,
        link:
          result.fullurl ||
          `https://${
            result.language || selectedLanguage
          }.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
        language: result.language || selectedLanguage,
      };

      onPagesChange([...selectedPages, newPage]);
    }

    // Clear input and dropdown
    setInputValue("");
    setSearchResults([]);
    setShowResults(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removePage = (indexToRemove: number) => {
    const newPages = selectedPages.filter(
      (_, index) => index !== indexToRemove
    );
    onPagesChange(newPages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleResultClick(searchResults[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowResults(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchResults]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, []);

  // Function to fetch search results from Wikipedia
  const fetchResults = async () => {
    try {
      // Set wiki to the selected language
      wiki.setLang(selectedLanguage);

      const searchResponse = await wiki.search(inputValue);
      if (searchResponse?.results?.length > 0) {
        // Get more complete data with the page API
        const detailedResults = await Promise.all(
          searchResponse.results.slice(0, 5).map(async (result) => {
            try {
              const summary = await wiki.summary(result.title);
              return {
                title: result.title,
                description: summary.extract || result.description || "",
                pageid: result.pageid,
                fullurl: summary.content_urls?.desktop?.page || result.fullurl,
                thumbnail: summary.thumbnail,
                pageviews: 0, // Note: pageviews not available in this API
                language: selectedLanguage, // Use the selected language
              };
            } catch (e) {
              return result; // Fallback to basic result
            }
          })
        );
        setSearchResults(detailedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      logger.error("Error searching Wikipedia:", error);
      setSearchResults([]);
    }
  };

  return (
    <div
      className={`relative ${className || ""}`}
      style={{
        width: "100%",
      }}
      ref={searchRef}
    >
      {/* Selected pages - moved above the search input */}
      <div
        className="flex flex-wrap gap-2 mb-4"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {selectedPages.map((page, index) => (
          <div
            key={index}
            className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full px-3 py-1"
            style={{
              backgroundColor: "var(--blue-100, #dbeafe)",
              color: "var(--blue-800, #1e40af)",
              borderRadius: "9999px",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
            }}
          >
            <span className="truncate max-w-xs">{page.title}</span>
            <span className="ml-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-1.5 py-0.5 rounded-full">
              {page.language}
            </span>
            <button
              type="button"
              className="ml-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
              onClick={() => removePage(index)}
              aria-label={`Remove ${page.title}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div
        className="relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        style={{
          padding: "0.25rem",
          borderRadius: "0.5rem",
        }}
      >
        {/* Search input - dropdown moved to right side */}
        <input
          type="text"
          ref={inputRef}
          className="flex-grow px-3 py-2 bg-transparent outline-none text-gray-700 dark:text-white"
          style={{
            backgroundColor: "transparent",
            boxShadow: "none",
            outline: "none",
            width: "100%",
            border: "none",
          }}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          autoFocus={autoFocus}
        />

        {/* Language dropdown with tooltip - moved to right side */}
        <div className="relative ml-2 flex-shrink-0 group">
          <select
            className="block appearance-none bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-1 px-2 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            aria-label="Select Wikipedia language"
            title="Select Wikipedia language"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
          <div className="absolute hidden group-hover:block bottom-full right-0 mb-2 bg-gray-800 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap">
            Search Wikipedia in this language
          </div>
        </div>
      </div>

      <div
        className="relative"
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {showResults && inputValue.trim() && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
            {searchResults.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((result, index) => (
                  <li
                    key={result.pageid}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start gap-3 ${
                      index === highlightedIndex
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
