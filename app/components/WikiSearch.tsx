import { useState, useEffect, useRef } from "react";

interface SearchResult {
  title: string;
  description: string;
  pageid: number;
  fullurl: string;
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
            `generator=search&gsrnamespace=0&gsrlimit=5&` +
            `prop=extracts|description|info&inprop=url&exintro=1&explaintext=1&` +
            `gsrsearch=${encodeURIComponent(inputValue)}`
        );

        const data = await response.json();

        if (data.query && data.query.pages) {
          const results = Object.values(data.query.pages).map((page: any) => ({
            title: page.title,
            description: page.description || page.extract || "",
            pageid: page.pageid,
            fullurl:
              page.fullurl ||
              `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
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
                  onClick={() => handleResultClick(result)}
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
