"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

    if (selectedPages.length === 1) {
      const pageName = selectedPages[0].link
        .split("/")
        .pop()
        ?.split("#")[0]
        ?.split("?")[0];

      if (!pageName) {
        setError("Invalid Wikipedia URL");
        setLoading(false);
        return;
      }

      router.push(`/timeline/${pageName}`);
    } else {
      const pageNames = selectedPages
        .map((page) => {
          return page.link.split("/").pop()?.split("#")[0]?.split("?")[0];
        })
        .filter(Boolean);

      const params = new URLSearchParams();
      pageNames.forEach((name) => {
        if (name) {
          params.append("pageNames", name);
        }
      });
      router.push(`/collection?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {loading ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Loading...
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            Please wait while we fetch and process the Wikipedia page.
          </p>
        </div>
      ) : (
        <div className="text-center w-full max-w-3xl">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
            Wiki Timeline
          </h1>
          <div className="absolute top-4 right-4 flex space-x-4">
            <Link href="/timelines" legacyBehavior>
              <a className="text-blue-500 hover:underline">Timelines</a>
            </Link>
            <Link href="/collections" legacyBehavior>
              <a className="text-blue-500 hover:underline">Collections</a>
            </Link>
            <Link href="/about" legacyBehavior>
              <a className="text-gray-500 hover:underline">About</a>
            </Link>
          </div>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Search and select Wikipedia pages to analyze their timelines.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <WikiSearch
              selectedPages={selectedPages}
              onPagesChange={setSelectedPages}
              onSubmit={handleSubmit}
              placeholder="Search Wikipedia pages..."
              className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Analyze
            </button>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      )}
    </div>
  );
}
