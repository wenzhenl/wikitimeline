import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
}

export default function WikiSearch({
  selectedPages,
  onPagesChange,
  onSubmit,
  placeholder,
  className,
}: WikiSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!inputValue.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?` +
            `action=query&format=json&origin=*&` +
            `generator=prefixsearch&` +
            `gpssearch=${encodeURIComponent(inputValue)}&` +
            `gpsnamespace=0&` +
            `gpslimit=10&` +
            `prop=extracts|description|info|pageimages|pageviews&` +
            `inprop=url&exintro=1&explaintext=1&` +
            `pithumbsize=80&pilimit=10&` +
            `pvipdays=30`
        );

        const data = await response.json();

        if (data.query && data.query.pages) {
          const results = Object.values(data.query.pages)
            .map((page: any) => ({
              title: page.title,
              description: page.description || page.extract || "",
              pageid: page.pageid,
              fullurl:
                page.fullurl ||
                `https://en.wikipedia.org/wiki/${encodeURIComponent(
                  page.title
                )}`,
              thumbnail: page.thumbnail,
              pageviews: Object.values(page.pageviews || {}).reduce<number>(
                (a, b) => a + (typeof b === "number" ? b : 0),
                0
              ),
            }))
            .sort((a, b) => (b.pageviews ?? 0) - (a.pageviews ?? 0));
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
  }, [inputValue]);

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
    onPagesChange([
      ...selectedPages,
      {
        title: result.title,
        link: result.fullurl,
      },
    ]);
    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removePage = (indexToRemove: number) => {
    onPagesChange(selectedPages.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showDropdown) {
      e.preventDefault();
      onSubmit();
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      selectedPages.length > 0
    ) {
      removePage(selectedPages.length - 1);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`flex flex-wrap items-center gap-2 p-2 border rounded-lg ${className}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedPages.map((page, index) => (
          <span
            key={index}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md"
          >
            {page.title}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePage(index);
              }}
              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={selectedPages.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[200px] bg-transparent outline-none dark:text-gray-100"
        />
      </div>

      {showDropdown && inputValue.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <p className="mt-2">Searching Wikipedia...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((result) => (
                <li
                  key={result.pageid}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start gap-3"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden bg-gray-100 dark:bg-gray-600">
                    {result.thumbnail ? (
                      <Image
                        src={result.thumbnail.source}
                        alt={result.title}
                        fill
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
  );
}
