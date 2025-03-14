import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import logger from "@/app/utils/logger";
import wiki from "wikipedia";
import {
  COMMON_LANGUAGES,
  DEFAULT_ENABLED_LANGUAGES,
  STORAGE_KEY_ENABLED_LANGUAGES,
} from "@/app/constants/languageSettings";
import {
  trackEvent,
  ANALYTICS_CATEGORIES,
  ANALYTICS_ACTIONS,
} from "@/app/utils/analytics";

// Add storage key for last used language
const STORAGE_KEY_LAST_LANGUAGE = "wikitimeline_last_language";

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
  [key: string]: any; // This can stay for flexibility
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
  inputClassName?: string;
  languageSelectorClassName?: string;
}

export default function WikiSearch({
  selectedPages,
  onPagesChange,
  onSubmit,
  placeholder,
  className,
  autoFocus = true,
  onSettingsClick,
  inputClassName,
  languageSelectorClassName,
}: WikiSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
    DEFAULT_ENABLED_LANGUAGES
  );
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default placeholder that mentions language capabilities
  const defaultPlaceholder =
    "Search or paste Wikipedia URLs (e.g., Albert Einstein, fr:Marie Curie)";

  // Load enabled languages and last used language from localStorage on mount
  useEffect(() => {
    const loadLanguageSettings = () => {
      try {
        // Load enabled languages
        const storedLanguages = localStorage.getItem(
          STORAGE_KEY_ENABLED_LANGUAGES
        );
        let parsedLanguages = DEFAULT_ENABLED_LANGUAGES;

        if (storedLanguages) {
          const tempParsedLanguages = JSON.parse(storedLanguages);
          if (
            Array.isArray(tempParsedLanguages) &&
            tempParsedLanguages.length > 0
          ) {
            parsedLanguages = tempParsedLanguages;
          }
        }
        setEnabledLanguages(parsedLanguages);

        // Load last used language
        const lastUsedLanguage = localStorage.getItem(
          STORAGE_KEY_LAST_LANGUAGE
        );
        if (lastUsedLanguage && parsedLanguages.includes(lastUsedLanguage)) {
          setSelectedLanguage(lastUsedLanguage);
        } else {
          setSelectedLanguage(parsedLanguages[0]);
        }
      } catch (error) {
        logger.error(
          "Error loading language settings from localStorage:",
          error
        );
        setEnabledLanguages(DEFAULT_ENABLED_LANGUAGES);
        setSelectedLanguage(DEFAULT_ENABLED_LANGUAGES[0]);
      }
    };

    loadLanguageSettings();

    // Add event listener for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY_ENABLED_LANGUAGES ||
        e.key === STORAGE_KEY_LAST_LANGUAGE
      ) {
        loadLanguageSettings();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Update last used language in localStorage when language changes
  useEffect(() => {
    if (selectedLanguage) {
      localStorage.setItem(STORAGE_KEY_LAST_LANGUAGE, selectedLanguage);
    }
  }, [selectedLanguage]);

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

        // Handle different URL patterns:
        // 1. Standard wiki URLs: /wiki/Title
        // 2. Language variant URLs: /zh-hans/Title or similar patterns

        // First check for standard /wiki/ pattern
        const wikiIndex = pathParts.findIndex((part) => part === "wiki");
        if (wikiIndex >= 0 && wikiIndex < pathParts.length - 1) {
          return {
            title: decodeURIComponent(
              pathParts[wikiIndex + 1].replace(/_/g, " ")
            ),
            language: langCode,
          };
        }

        // If not found, check for language variant pattern (e.g., /zh-hans/)
        if (pathParts.length >= 3) {
          // Check if the second path part is a language variant (contains a hyphen and the base language code)
          const potentialLangVariant = pathParts[1];
          if (
            potentialLangVariant &&
            potentialLangVariant.includes("-") &&
            potentialLangVariant.startsWith(langCode)
          ) {
            return {
              title: decodeURIComponent(pathParts[2].replace(/_/g, " ")),
              language: langCode,
            };
          }

          // If the second path part exists and isn't 'wiki', it might be the title
          // This handles other non-standard URL patterns
          if (
            potentialLangVariant &&
            potentialLangVariant !== "wiki" &&
            pathParts[2]
          ) {
            return {
              title: decodeURIComponent(pathParts[2].replace(/_/g, " ")),
              language: langCode,
            };
          }
        }
      }
    } catch (e) {
      // Invalid URL, continue with title detection
      logger.error("Error parsing Wikipedia URL:", e);
    }
    return null;
  };

  // Function to fetch Wikipedia search results
  const fetchWikipediaResults = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    // Track search query
    trackEvent(
      ANALYTICS_CATEGORIES.SEARCH,
      ANALYTICS_ACTIONS.SEARCH_QUERY,
      query
    );

    try {
      // Check if query contains a language prefix (e.g., "zh:胡")
      let languageToUse = selectedLanguage;
      let searchQuery = query;

      // Parse language prefix if present (format: "xx:")
      const langPrefixMatch = query.match(/^([a-z]{2,3}):(.+)/);
      if (langPrefixMatch) {
        const [, langPrefix, actualQuery] = langPrefixMatch;
        // Only use detected language if it's in enabled languages
        if (enabledLanguages.includes(langPrefix)) {
          languageToUse = langPrefix;
          searchQuery = actualQuery.trim();
          // If language differs from dropdown, temporarily set it
          if (languageToUse !== selectedLanguage) {
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
                  objectID: `${languageToUse}-${summary.pageid || 0}`,
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
                  objectID: `${languageToUse}-${title}`,
                };
              }
            })
        );

        setSearchResults(detailedResults.filter(Boolean));
        setShowResults(true);
        setIsLoading(false);
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
                  objectID: `${languageToUse}-${result.pageid}`,
                };
              } catch (e) {
                return {
                  ...result,
                  language: languageToUse,
                  objectID: `${languageToUse}-${result.pageid}`,
                };
              }
            })
        );

        setSearchResults(detailedResults);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(true);
      }
    } catch (error) {
      logger.error("Error searching Wikipedia:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL input
  const handleUrlInput = (value: string): boolean => {
    // Check if input looks like a Wikipedia URL
    if (value.includes("wikipedia.org") || value.includes("/wiki/")) {
      const wikiTitle = extractWikiTitle(value);
      if (wikiTitle) {
        // Track URL paste
        trackEvent(
          ANALYTICS_CATEGORIES.SEARCH,
          ANALYTICS_ACTIONS.URL_PASTE,
          wikiTitle.title
        );

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
        setShowResults(false);
        return true;
      }
    }
    return false;
  };

  // Handle language prefix in input
  const handleLanguagePrefix = (value: string): boolean => {
    // If there's a language prefix in the format "xx:", update dropdown
    const langPrefixMatch = value.match(/^([a-z]{2,3}):(.*)/);
    if (langPrefixMatch) {
      const [, langPrefix] = langPrefixMatch;
      // Only update dropdown if it's an enabled language
      if (
        enabledLanguages.includes(langPrefix) &&
        langPrefix !== selectedLanguage
      ) {
        // Track language change via prefix
        trackEvent(
          ANALYTICS_CATEGORIES.LANGUAGE,
          ANALYTICS_ACTIONS.LANGUAGE_CHANGE,
          `prefix_${langPrefix}`
        );
        setSelectedLanguage(langPrefix);
        return true;
      }
    }
    return false;
  };

  const handleResultClick = (result: SearchResult) => {
    // Track result selection
    trackEvent(
      ANALYTICS_CATEGORIES.SEARCH,
      ANALYTICS_ACTIONS.SELECT_RESULT,
      result.title
    );

    // Add the selected result to the list of selected pages
    const newPage = {
      title: result.title,
      link: result.fullurl,
      language: result.language || selectedLanguage,
    };

    onPagesChange([...selectedPages, newPage]);
    setInputValue("");
    setShowResults(false);
  };

  const removePage = (indexToRemove: number) => {
    onPagesChange(selectedPages.filter((_, index) => index !== indexToRemove));
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check for URLs
    if (handleUrlInput(value)) {
      return;
    }

    // Check for language prefixes
    handleLanguagePrefix(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search to avoid too many requests
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        fetchWikipediaResults(value);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  // Handle key navigation in search results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        // Track timeline generation via enter key
        trackEvent(
          ANALYTICS_CATEGORIES.TIMELINE,
          ANALYTICS_ACTIONS.GENERATE_TIMELINE,
          "enter_key",
          selectedPages.length
        );
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleResultClick(searchResults[highlightedIndex]);
        } else {
          onSubmit();
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowResults(false);
        break;
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`w-full ${className || ""}`}>
      {/* Selected pages display */}
      <div className="flex flex-wrap gap-2 mb-3" data-tour="selected-pages">
        {selectedPages.map((page, index) => (
          <div
            key={index}
            className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-3 py-1 rounded-full text-sm"
          >
            <span className="mr-1 font-medium">{page.title}</span>
            <span className="text-xs bg-blue-200 dark:bg-blue-800 px-1 rounded mr-1">
              {page.language}
            </span>
            <button
              type="button"
              onClick={() => removePage(index)}
              className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
              aria-label={`Remove ${page.title}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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

      {/* Search container (using div instead of form) */}
      <div className="flex">
        <div className="flex-grow relative" ref={searchContainerRef}>
          {/* Input wrapper with integrated language selector */}
          <div className="relative flex w-full" data-tour="search-input">
            <input
              ref={searchInputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => inputValue.trim() && setShowResults(true)}
              placeholder={placeholder || defaultPlaceholder}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-white pr-20 ${
                inputClassName || ""
              }`}
              autoFocus={autoFocus}
            />

            {/* Language selector positioned inside the input */}
            <div
              className={`absolute right-1 top-1/2 -translate-y-1/2 ${
                languageSelectorClassName || ""
              }`}
              data-tour="language-selector"
            >
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the settings option was selected
                  if (value === "settings" && onSettingsClick) {
                    onSettingsClick();
                    // Reset to the previously selected language
                    setTimeout(() => (e.target.value = selectedLanguage), 0);
                  } else {
                    // Track language change via dropdown
                    trackEvent(
                      ANALYTICS_CATEGORIES.LANGUAGE,
                      ANALYTICS_ACTIONS.LANGUAGE_CHANGE,
                      `dropdown_${value}`
                    );
                    setSelectedLanguage(value);
                  }
                }}
                className="py-1 px-2 text-sm rounded border-none bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 uppercase"
                aria-label="Select language"
              >
                {enabledLanguages.map((lang) => {
                  const language = COMMON_LANGUAGES.find(
                    (l) => l.code === lang
                  );
                  return (
                    <option key={lang} value={lang} className="uppercase">
                      {language ? language.code : lang}
                    </option>
                  );
                })}
                {/* Settings option with improved styling */}
                {onSettingsClick && (
                  <option
                    value="settings"
                    className="text-blue-500 dark:text-blue-400 border-t border-gray-200 dark:border-gray-700 font-medium"
                  >
                    ＋
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Search Results Dropdown - full width to match input+dropdown */}
          {showResults && inputValue.trim() && (
            <div
              className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden"
              data-tour="search-results"
            >
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading results...
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {searchResults.map((result, index) => (
                    <li
                      key={result.pageid || `result-${index}`}
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
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-8 w-8"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </h3>
                          {result.language && (
                            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded">
                              {result.language}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {result.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
