import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import logger from "@/app/utils/logger";
import wiki from "wikipedia";
import {
  COMMON_LANGUAGES,
  DEFAULT_ENABLED_LANGUAGES,
  STORAGE_KEY_ENABLED_LANGUAGES,
  LanguageOption,
} from "@/app/constants/languageSettings";

// Constants for search configuration
const MAX_AUTOCOMPLETE_RESULTS = 20;
const MAX_SEARCH_RESULTS_TO_DISPLAY = 20;
const SEARCH_DEBOUNCE_MS = 300;

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
  onSettingsClick?: () => void;
}

export default function WikiSearch({
  selectedPages,
  onPagesChange,
  onSubmit,
  placeholder,
  className,
  autoFocus = true,
  onSettingsClick,
}: WikiSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
    DEFAULT_ENABLED_LANGUAGES
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default placeholder that mentions language capabilities
  const defaultPlaceholder =
    "Search Wikipedia or paste URL (e.g., Albert Einstein, fr:Marie Curie)";

  // Load enabled languages from localStorage on mount
  useEffect(() => {
    const loadEnabledLanguages = () => {
      try {
        const storedLanguages = localStorage.getItem(
          STORAGE_KEY_ENABLED_LANGUAGES
        );
        if (storedLanguages) {
          const parsedLanguages = JSON.parse(storedLanguages);
          if (Array.isArray(parsedLanguages) && parsedLanguages.length > 0) {
            setEnabledLanguages(parsedLanguages);
            return;
          }
        }
        // Fallback to default if storage is empty or invalid
        setEnabledLanguages(DEFAULT_ENABLED_LANGUAGES);
      } catch (error) {
        logger.error(
          "Error loading enabled languages from localStorage:",
          error
        );
        setEnabledLanguages(DEFAULT_ENABLED_LANGUAGES);
      }
    };

    loadEnabledLanguages();

    // Add event listener for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_ENABLED_LANGUAGES) {
        loadEnabledLanguages();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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

  // Function to fetch autocompletions from Wikipedia
  const fetchAutocompletions = async (query: string): Promise<string[]> => {
    if (!query.trim()) return [];

    try {
      // Set wiki to the selected language
      wiki.setLang(selectedLanguage);

      // Use the autocompletions API
      const suggestions = await wiki.autocompletions(query, {
        limit: MAX_AUTOCOMPLETE_RESULTS,
      });

      return suggestions;
    } catch (error) {
      logger.error("Error fetching autocompletions:", error);
      return [];
    }
  };

  // Function to fetch search results from Wikipedia
  const fetchResults = async () => {
    if (!inputValue.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // Set wiki to the selected language
      wiki.setLang(selectedLanguage);

      // First try to get autocompletions for better suggestions
      const suggestions = await fetchAutocompletions(inputValue);

      if (suggestions.length > 0) {
        // Get detailed results for the top suggestions
        const detailedResults = await Promise.all(
          suggestions
            .slice(0, MAX_SEARCH_RESULTS_TO_DISPLAY)
            .map(async (title) => {
              try {
                const summary = await wiki.summary(title);
                return {
                  title,
                  description: summary.extract || "",
                  pageid: summary.pageid || 0,
                  fullurl:
                    summary.content_urls?.desktop?.page ||
                    `https://${selectedLanguage}.wikipedia.org/wiki/${encodeURIComponent(
                      title
                    )}`,
                  thumbnail: summary.thumbnail,
                  pageviews: 0,
                  language: selectedLanguage,
                };
              } catch (e) {
                // If summary fails, create a basic result
                return {
                  title,
                  description: "",
                  pageid: 0,
                  fullurl: `https://${selectedLanguage}.wikipedia.org/wiki/${encodeURIComponent(
                    title
                  )}`,
                  pageviews: 0,
                  language: selectedLanguage,
                };
              }
            })
        );

        setSearchResults(detailedResults.filter(Boolean));
        return;
      }

      // Fallback to regular search if no autocompletions
      const searchResponse = await wiki.search(inputValue);
      if (searchResponse?.results?.length > 0) {
        // Get more complete data with the page API
        const detailedResults = await Promise.all(
          searchResponse.results
            .slice(0, MAX_SEARCH_RESULTS_TO_DISPLAY)
            .map(async (result) => {
              try {
                const summary = await wiki.summary(result.title);
                return {
                  title: result.title,
                  description: summary.extract || result.description || "",
                  pageid: result.pageid,
                  fullurl:
                    summary.content_urls?.desktop?.page || result.fullurl,
                  thumbnail: summary.thumbnail,
                  pageviews: 0,
                  language: selectedLanguage,
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
    }, SEARCH_DEBOUNCE_MS);

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
            className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg px-3 py-1"
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "var(--blue-100, #dbeafe)",
              color: "var(--blue-800, #1e40af)",
              borderRadius: "0.5rem",
              padding: "0.25rem 0.75rem",
            }}
          >
            <span className="truncate max-w-xs">{page.title}</span>
            <button
              type="button"
              className="ml-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
              onClick={() => removePage(index)}
              aria-label={`Remove ${page.title}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Search container with fixed dimensions and explicit border styles */}
      <div
        className="flex items-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"
        style={{
          width: "100%",
          height: "40px",
          padding: "4px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Search input - simplified styles with explicit width */}
        <div
          style={{
            width: "calc(100% - 105px)",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <input
            type="text"
            ref={inputRef}
            className="w-full h-full bg-transparent outline-none text-gray-700 dark:text-white"
            style={{
              width: "100%",
              height: "100%",
              padding: "0 12px",
              border: "none",
              boxSizing: "border-box",
              backgroundColor: "transparent",
              outline: "none",
            }}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || defaultPlaceholder}
            autoFocus={autoFocus}
          />
        </div>

        {/* Language dropdown with fixed width and explicit positioning - now showing only codes */}
        <div
          style={{
            width: "60px",
            height: "100%",
            position: "relative",
            boxSizing: "border-box",
            marginLeft: "5px",
          }}
        >
          <select
            className="w-full h-full px-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white"
            style={{
              width: "100%",
              height: "100%",
              appearance: "none",
              paddingRight: "20px",
              paddingLeft: "6px",
              boxSizing: "border-box",
              borderRadius: "0.5rem",
              textTransform: "uppercase",
              fontWeight: "500",
            }}
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            aria-label="Select Wikipedia language"
            title="Select Wikipedia language"
          >
            {/* Only show enabled languages */}
            {COMMON_LANGUAGES.filter((lang) =>
              enabledLanguages.includes(lang.code)
            ).map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.code.toUpperCase()}
              </option>
            ))}
          </select>
          {/* Arrow positioned absolutely within the container */}
          <div
            style={{
              position: "absolute",
              right: "5px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              width: "10px",
              height: "10px",
            }}
          >
            <svg
              className="text-gray-700 dark:text-gray-300"
              style={{
                width: "100%",
                height: "100%",
                fill: "currentColor",
              }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        {/* Settings button - add only if onSettingsClick is provided */}
        {onSettingsClick && (
          <div
            style={{
              width: "32px",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "5px",
            }}
          >
            <button
              type="button"
              onClick={onSettingsClick}
              className="flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Language Settings"
              title="Language Settings"
            >
              <svg
                className="w-5 h-5"
                style={{
                  width: "20px",
                  height: "20px",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Search results container */}
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
