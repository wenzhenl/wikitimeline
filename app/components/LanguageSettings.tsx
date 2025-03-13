import { useState, useEffect } from "react";
import logger from "@/app/utils/logger";
import {
  COMMON_LANGUAGES,
  DEFAULT_ENABLED_LANGUAGES,
  STORAGE_KEY_ENABLED_LANGUAGES,
} from "@/app/constants/languageSettings";

interface LanguageSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageSettings({
  isOpen,
  onClose,
}: LanguageSettingsProps) {
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
    DEFAULT_ENABLED_LANGUAGES
  );

  // Load enabled languages from localStorage on mount
  useEffect(() => {
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
      logger.error("Error loading enabled languages from localStorage:", error);
      setEnabledLanguages(DEFAULT_ENABLED_LANGUAGES);
    }
  }, []);

  // Toggle a language selection
  const toggleLanguage = (code: string) => {
    let updatedLanguages: string[];

    if (enabledLanguages.includes(code)) {
      // Don't allow removing a language if it's the only language enabled
      if (enabledLanguages.length === 1) {
        return;
      }
      // Remove language
      updatedLanguages = enabledLanguages.filter((lang) => lang !== code);
    } else {
      // Add language
      updatedLanguages = [...enabledLanguages, code];
    }

    // Update state
    setEnabledLanguages(updatedLanguages);

    // Save to localStorage
    try {
      localStorage.setItem(
        STORAGE_KEY_ENABLED_LANGUAGES,
        JSON.stringify(updatedLanguages)
      );
      // Dispatch storage event for cross-tab communication
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY_ENABLED_LANGUAGES,
          newValue: JSON.stringify(updatedLanguages),
        })
      );
    } catch (error) {
      logger.error("Error saving enabled languages to localStorage:", error);
    }
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Language Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
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

        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select the languages you want to enable for Wikipedia searches:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {COMMON_LANGUAGES.map((lang) => (
              <div key={lang.code} className="flex items-center">
                <input
                  type="checkbox"
                  id={`lang-${lang.code}`}
                  checked={enabledLanguages.includes(lang.code)}
                  onChange={() => toggleLanguage(lang.code)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={
                    enabledLanguages.includes(lang.code) &&
                    enabledLanguages.length === 1
                  }
                />
                <label
                  htmlFor={`lang-${lang.code}`}
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="uppercase font-mono mr-1">{lang.code}</span>{" "}
                  - {lang.name}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
