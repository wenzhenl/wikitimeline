"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WikiSearch from "./components/WikiSearch";

export default function HomePage() {
  const [searchInputs, setSearchInputs] = useState<string[]>([""]);
  const [wikiLinks, setWikiLinks] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearchChange = (index: number, value: string) => {
    const newSearchInputs = [...searchInputs];
    newSearchInputs[index] = value;
    setSearchInputs(newSearchInputs);
  };

  const handleWikiSelect = (index: number, wikiLink: string) => {
    const newWikiLinks = [...wikiLinks];
    newWikiLinks[index] = wikiLink;
    setWikiLinks(newWikiLinks);

    const newSearchInputs = [...searchInputs];
    newSearchInputs[index] = new URL(wikiLink).pathname.split("/").pop() || "";
    setSearchInputs(newSearchInputs);
  };

  const addWikiLink = () => {
    setSearchInputs([...searchInputs, ""]);
    setWikiLinks([...wikiLinks, ""]);
  };

  const removeWikiLink = (index: number) => {
    const newSearchInputs = searchInputs.filter((_, i) => i !== index);
    const newWikiLinks = wikiLinks.filter((_, i) => i !== index);
    setSearchInputs(newSearchInputs);
    setWikiLinks(newWikiLinks);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validWikiLinks = wikiLinks.filter((link) => link.trim() !== "");

    if (validWikiLinks.length === 0) {
      setError("Please select at least one Wikipedia page.");
      setLoading(false);
      return;
    }

    if (validWikiLinks.length === 1) {
      const pageName = new URL(validWikiLinks[0]).pathname.split("/").pop();
      router.push(`/timeline/${pageName}`);
    } else {
      const pageNames = validWikiLinks.map((link) => {
        return new URL(link).pathname.split("/").pop();
      });
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
            Enter one or more Wikipedia links to analyze their timelines. All
            links must be valid.
          </p>
          <form onSubmit={handleSubmit}>
            {searchInputs.map((input, index) => (
              <div key={index} className="flex items-center mb-2">
                <WikiSearch
                  value={input}
                  onChange={(value) => handleSearchChange(index, value)}
                  onSelect={(wikiLink) => handleWikiSelect(index, wikiLink)}
                  placeholder="Search Wikipedia pages..."
                  className="p-2 w-full border border-gray-300 rounded-l-lg dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
                {index === 0 ? (
                  <button
                    type="button"
                    onClick={addWikiLink}
                    className="p-2 bg-green-500 text-white rounded-r-lg hover:bg-green-600"
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeWikiLink(index)}
                    className="p-2 bg-red-500 text-white rounded-r-lg hover:bg-red-600"
                  >
                    -
                  </button>
                )}
              </div>
            ))}
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
