"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import WikiSearch from "@/app/components/WikiSearch";
import LanguageSettings from "@/app/components/LanguageSettings";
import { PAGE_DELIMITER } from "@/app/constants";
import { isMobile } from "@/app/utils/deviceDetection";

interface SelectedPage {
  title: string;
  link: string;
  language: string; // Language code (e.g., "en", "fr", "de")
}

export function ClientSearchWrapper() {
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [error, setError] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (selectedPages.length === 0) {
      setError("Please select at least one Wikipedia page.");
      return;
    }
    setError("");

    // Create pageName parameters
    const pageNames = selectedPages
      .map((page) => {
        // For each page, format as 'language:PageName'
        if (page.title) {
          // Add language prefix if not from the default language
          const formattedName =
            page.language !== "en"
              ? `${page.language}:${page.title.replace(/ /g, "_")}`
              : page.title.replace(/ /g, "_");

          return formattedName;
        }
        return null;
      })
      .filter(Boolean);

    if (!pageNames.length) {
      setError("Invalid Wikipedia URL or title");
      return;
    }

    const baseUrl = `/timeline/${pageNames.join(
      encodeURIComponent(PAGE_DELIMITER)
    )}`;
    const targetUrl = isMobile() ? `${baseUrl}/text` : baseUrl;

    router.push(targetUrl);
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8"
      style={{
        padding: "1.5rem", // matches p-6
        marginBottom: "2rem", // matches mb-8
        width: "100%",
        borderRadius: "1rem", // matches rounded-2xl
      }}
    >
      {/* Language settings title bar with button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Create Timeline
        </h2>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          aria-label="Language Settings"
          title="Language Settings"
        >
          <svg
            className="w-4 h-4"
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
          <span>Languages</span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem", // matches space-y-4
          width: "100%",
        }}
      >
        <WikiSearch
          selectedPages={selectedPages}
          onPagesChange={setSelectedPages}
          onSubmit={handleSubmit}
          placeholder="Search or paste Wikipedia URLs (e.g. 'Albert Einstein' or 'wikipedia.org/wiki/World_War_II')..."
          className="flex-1"
        />
        <button
          type="submit"
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          style={{
            width: "100%",
            padding: "0.75rem 1.5rem", // matches py-3 px-6
            borderRadius: "0.5rem", // matches rounded-lg
          }}
        >
          Generate Timeline
        </button>
      </form>
      {error && (
        <div
          className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
          style={{
            marginTop: "1rem", // matches mt-4
            padding: "0.75rem", // matches p-3
            borderRadius: "0.5rem", // matches rounded-lg
          }}
        >
          {error}
        </div>
      )}

      {/* Language Settings Modal */}
      <LanguageSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
