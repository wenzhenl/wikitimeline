"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import WikiSearch from "@/app/components/WikiSearch";
import { PAGE_DELIMITER } from "@/app/constants";

interface SelectedPage {
  title: string;
  link: string;
}

export function ClientSearchWrapper() {
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (selectedPages.length === 0) {
      setError("Please select at least one Wikipedia page.");
      return;
    }

    setError("");

    // Get all page names and encode them
    const pageNames = selectedPages
      .map((page) => {
        const titleFromUrl = page.link.split("/wiki/").pop();
        if (titleFromUrl) {
          const cleanTitle = decodeURIComponent(
            titleFromUrl.split("#")[0].split("?")[0]
          );
          return encodeURIComponent(cleanTitle);
        }
        return null;
      })
      .filter(Boolean);

    if (!pageNames.length) {
      setError("Invalid Wikipedia URL or title");
      return;
    }

    // Join with encoded delimiter and redirect
    router.push(
      `/timeline/${pageNames.join(encodeURIComponent(PAGE_DELIMITER))}`
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
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
        >
          Generate Timeline
        </button>
      </form>
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
