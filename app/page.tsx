"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import WikiSearch from "./components/WikiSearch";

interface SelectedPage {
  title: string;
  link: string;
}

export default function HomePage() {
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (selectedPages.length === 0) {
      setError("Please select at least one Wikipedia page.");
      return;
    }

    setLoading(true);
    setError("");

    // Get all page names
    const pageNames = selectedPages
      .map((page) => {
        return page.link.split("/").pop()?.split("#")[0]?.split("?")[0];
      })
      .filter(Boolean);

    if (!pageNames.length) {
      setError("Invalid Wikipedia URL");
      setLoading(false);
      return;
    }

    // Join all page names with commas and redirect to timeline page
    router.push(`/timeline/${pageNames.join(",")}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            Loading...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please wait while we fetch and process the Wikipedia page.
          </p>
        </div>
      ) : (
        <div className="text-center w-full max-w-4xl mx-auto py-16 px-4">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            Transform Wikipedia into Interactive Timelines
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Instantly convert any Wikipedia article into a beautiful,
            interactive timeline. Perfect for students, researchers, and history
            enthusiasts.
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <WikiSearch
                selectedPages={selectedPages}
                onPagesChange={setSelectedPages}
                onSubmit={handleSubmit}
                placeholder="Search Wikipedia pages (e.g., 'World War II', 'Albert Einstein')..."
                className="flex-1 border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 transition-all"
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

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                Instant Generation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Convert any Wikipedia article into a timeline in seconds
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                Multiple Pages
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Compare multiple timelines side by side
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                Interactive View
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Zoom, scroll, and explore events interactively
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
