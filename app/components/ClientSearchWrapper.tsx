"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import WikiSearch from "@/app/components/WikiSearch";
import LanguageSettings from "@/app/components/LanguageSettings";
import { PAGE_DELIMITER, PAGE_NAME_SEPARATOR } from "@/app/constants";
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
              ? `${page.language}${PAGE_NAME_SEPARATOR}${page.title.replace(/ /g, "_")}`
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

  // Pass the settings button handler to the WikiSearch component
  const openLanguageSettings = () => setIsSettingsOpen(true);

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
      {/* Remove the header div and integrate language settings directly with WikiSearch */}
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
          onSettingsClick={openLanguageSettings}
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
