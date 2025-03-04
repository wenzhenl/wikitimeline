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
const IME_DEBOUNCE_MS = 900; // Longer debounce for IME composition
const IME_COMPLETE_DELAY = 200; // Delay after composition ends before searching

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
  const [isComposing, setIsComposing] = useState(false); // Track IME composition
  const searchRef = useRef<HTMLDivElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Store timeout reference
  const [lastCompletedValue, setLastCompletedValue] = useState(""); // Track last completed IME value
  const compositionEndTimeRef = useRef<number | null>(null); // Track composition end time

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
      // Check if query contains a language prefix (e.g., "zh:胡")
      let languageToUse = selectedLanguage;
      let searchQuery = query;

      // Parse language prefix if present (format: "xx:")
      const langPrefixMatch = query.match(/^([a-z]{2}):(.+)/);
      if (langPrefixMatch) {
        const [, langPrefix, actualQuery] = langPrefixMatch;
        // Only use detected language if it's in enabled languages
        if (enabledLanguages.includes(langPrefix)) {
          languageToUse = langPrefix;
          searchQuery = actualQuery.trim();
        }
      }

      // Set wiki to the correct language
      wiki.setLang(languageToUse);

      // Ensure query is properly encoded for international characters
      const encodedQuery = encodeURIComponent(searchQuery);

      // Use the autocompletions API with proper encoding
      const suggestions = await wiki.autocompletions(searchQuery, {
        limit: MAX_AUTOCOMPLETE_RESULTS,
      });

      return suggestions.map((suggestion) => {
        // If we used a language prefix, maintain the prefix in results for clarity
        return langPrefixMatch ? `${languageToUse}:${suggestion}` : suggestion;
      });
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
      // Check if query contains a language prefix (e.g., "zh:胡")
      let languageToUse = selectedLanguage;
      let searchQuery = inputValue;

      // Parse language prefix if present (format: "xx:")
      const langPrefixMatch = inputValue.match(/^([a-z]{2}):(.+)/);
      if (langPrefixMatch) {
        const [, langPrefix, actualQuery] = langPrefixMatch;
        // Only use detected language if it's in enabled languages
        if (enabledLanguages.includes(langPrefix)) {
          languageToUse = langPrefix;
          searchQuery = actualQuery.trim();
          // If language differs from dropdown, temporarily set it
          if (languageToUse !== selectedLanguage) {
            // We're not updating the visible dropdown, just using
            // this language for this specific search
            logger.debug(
              `Using detected language: ${languageToUse} for search`
            );
          }
        }
      }

      // Set wiki to the correct language
      wiki.setLang(languageToUse);

      logger.debug(`Setting language for search to: ${languageToUse}`);

      // First try to get autocompletions for better suggestions
      let suggestions: string[] = [];

      try {
        // Use autocompletions with properly encoded query
        suggestions = await wiki.autocompletions(searchQuery, {
          limit: MAX_AUTOCOMPLETE_RESULTS,
        });
      } catch (autoError) {
        logger.error("Error with autocompletions API:", autoError);
        // Continue with regular search if autocompletions fails
      }

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
                    `https://${languageToUse}.wikipedia.org/wiki/${encodeURIComponent(
                      title
                    )}`,
                  thumbnail: summary.thumbnail,
                  pageviews: 0,
                  language: languageToUse,
                };
              } catch (e) {
                // If summary fails, create a basic result with the language still set
                return {
                  title,
                  description: "",
                  pageid: 0,
                  fullurl: `https://${languageToUse}.wikipedia.org/wiki/${encodeURIComponent(
                    title
                  )}`,
                  pageviews: 0,
                  language: languageToUse,
                };
              }
            })
        );

        setSearchResults(detailedResults.filter(Boolean));
        return;
      }

      // Fallback to regular search if no autocompletions
      const searchResponse = await wiki.search(searchQuery);
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
                  language: languageToUse,
                };
              } catch (e) {
                return {
                  ...result,
                  language: languageToUse,
                };
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

    // If there's a language prefix in the format "xx:", update dropdown
    const langPrefixMatch = value.match(/^([a-z]{2}):(.*)/);
    if (langPrefixMatch) {
      const [, langPrefix] = langPrefixMatch;
      // Only update dropdown if it's an enabled language
      if (
        enabledLanguages.includes(langPrefix) &&
        langPrefix !== selectedLanguage
      ) {
        setSelectedLanguage(langPrefix);
      }
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Skip immediate search if we're currently composing characters
    if (isComposing) {
      // Don't initiate search during composition
      return;
    }

    // Check if this is right after composition end (within 300ms)
    const isImmediatelyAfterComposition =
      compositionEndTimeRef.current &&
      Date.now() - compositionEndTimeRef.current < 300;

    // If this change happens immediately after composition end, we should skip it
    // as the onCompositionEnd handler will trigger the search with the final value
    if (isImmediatelyAfterComposition && value === lastCompletedValue) {
      return;
    }

    // Use a regex to detect if there are non-Latin characters in the query
    // This helps determine if we should use longer debounce for non-Latin scripts
    const hasNonLatinChars = /[^\u0000-\u007F]/.test(value);
    const debounceTime = hasNonLatinChars
      ? IME_DEBOUNCE_MS
      : SEARCH_DEBOUNCE_MS;

    // Debounced search logic
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        // Log the search query to help with debugging
        logger.debug(
          `Searching for: "${value}" with language: ${selectedLanguage}`
        );
        fetchResults();
      } else {
        setSearchResults([]);
      }
    }, debounceTime);
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
      // Always use the result's language if available, or the currently selected language
      const pageLanguage = result.language || selectedLanguage;

      logger.debug(
        `Adding page with language: ${pageLanguage}, title: ${result.title}, selectedLanguage: ${selectedLanguage}`
      );

      const newPage = {
        title: result.title,
        link:
          result.fullurl ||
          `https://${pageLanguage}.wikipedia.org/wiki/${encodeURIComponent(
            result.title
          )}`,
        language: pageLanguage,
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

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Add a useEffect to update Wikipedia's language setting when the language changes
  useEffect(() => {
    // Set wiki to use the selected language
    wiki.setLang(selectedLanguage);
    logger.debug(`Language changed to: ${selectedLanguage}`);
  }, [selectedLanguage]);

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
            <span className="truncate max-w-xs">
              {page.language !== "en" ? `${page.language}:` : ""}
              {/* Handle potentially encoded titles */}
              {(() => {
                // Get the original title
                let displayTitle = page.title;

                // Check if it's URL encoded or contains encoded characters
                if (/%[0-9A-F]{2}/i.test(displayTitle)) {
                  try {
                    // Try to decode URL-encoded title
                    displayTitle = decodeURIComponent(displayTitle);
                  } catch (e) {
                    // If decoding fails, use the original
                    logger.warn(`Failed to decode title: ${displayTitle}`, e);
                  }
                }

                return displayTitle;
              })()}
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
            // Add composition event handlers for IME input
            onCompositionStart={() => {
              setIsComposing(true);
              logger.debug("IME composition started");
            }}
            onCompositionUpdate={(e) => {
              // Track composition updates for debugging
              logger.debug("IME composition update:", e.data);
            }}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              compositionEndTimeRef.current = Date.now();
              setLastCompletedValue(e.data);
              logger.debug("IME composition ended, final value:", e.data);

              // Capture the composed value directly from the event
              const finalValue = e.data;
              if (finalValue && finalValue.trim()) {
                // Use the value from the composition event rather than state
                // which might not be updated yet
                setTimeout(() => {
                  logger.debug(
                    "Triggering search with composed value:",
                    finalValue
                  );
                  // We need to make sure inputValue is updated before fetching
                  if (inputValue === finalValue) {
                    fetchResults();
                  }
                }, IME_COMPLETE_DELAY);
              }
            }}
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
            key={`lang-select-${selectedPages.length}`}
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
            onChange={(e) => {
              const newLanguage = e.target.value;
              logger.debug(`Language dropdown changed to: ${newLanguage}`);
              setSelectedLanguage(newLanguage);
              // Clear any pending searches
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
            }}
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
