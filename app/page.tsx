"use client";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function HomePage() {
  const router = useRouter();
  const [wikiLink, setWikiLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const urlPattern = /^(https?:\/\/)?(en\.)?wikipedia\.org\/wiki\/\w+/i;

    if (!urlPattern.test(wikiLink)) {
      setError("Invalid Wikipedia link. Please enter a valid link.");
      setLoading(false);
      return;
    }

    try {
      const url = new URL(wikiLink);
      const pageName = url.pathname.split("/").pop();
      router.push(`/timeline/${pageName}`);
    } catch (error) {
      setError("Invalid URL format.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
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
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
            Wiki Timeline
          </h1>
          <form
            onSubmit={handleSubmit}
            className="flex items-center justify-center"
          >
            <input
              type="text"
              value={wikiLink}
              onChange={(e) => setWikiLink(e.target.value)}
              placeholder="Enter Wikipedia link"
              className="p-2 w-96 border border-gray-300 rounded-l-lg dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              required
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600"
            >
              Search
            </button>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      )}
    </div>
  );
}
