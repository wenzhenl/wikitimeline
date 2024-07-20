"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const [wikiLinks, setWikiLinks] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (index: number, value: string) => {
    const newWikiLinks = [...wikiLinks];
    newWikiLinks[index] = value;
    setWikiLinks(newWikiLinks);
  };

  const addWikiLink = () => {
    setWikiLinks([...wikiLinks, ""]);
  };

  const removeWikiLink = (index: number) => {
    const newWikiLinks = wikiLinks.filter((_, i) => i !== index);
    setWikiLinks(newWikiLinks);
  };

  const validateLinks = () => {
    const urlPattern = /^(https?:\/\/)?((en\.)?wikipedia\.org\/wiki\/\w+)/i;
    return wikiLinks.map((link) => urlPattern.test(link));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validLinks = validateLinks();
    if (validLinks.includes(false)) {
      setError("Please ensure all links are valid Wikipedia links.");
      setLoading(false);
      return;
    }

    const validWikiLinks = wikiLinks.filter((_, index) => validLinks[index]);

    if (validWikiLinks.length === 1) {
      const url = validWikiLinks[0].startsWith("http")
        ? validWikiLinks[0]
        : `https://${validWikiLinks[0]}`;
      const parsedUrl = new URL(url);
      const pageName = parsedUrl.pathname.split("/").pop();
      router.push(`/timeline/${pageName}`);
    } else {
      const pageNames = validWikiLinks.map((link) => {
        const url = link.startsWith("http") ? link : `https://${link}`;
        const parsedUrl = new URL(url);
        return parsedUrl.pathname.split("/").pop();
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

  const validLinks = validateLinks();

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
          </div>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Enter one or more Wikipedia links. All links must be valid.
          </p>
          <form onSubmit={handleSubmit}>
            {wikiLinks.map((link, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  placeholder="Enter Wikipedia link"
                  className={`p-2 w-full border ${
                    validLinks[index] ? "border-gray-300" : "border-red-500"
                  } rounded-l-lg dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600`}
                  required
                />
                {index === 0 && (
                  <button
                    type="button"
                    onClick={addWikiLink}
                    className="p-2 bg-green-500 text-white rounded-r-lg hover:bg-green-600"
                  >
                    +
                  </button>
                )}
                {index > 0 && (
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
              Search
            </button>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      )}
    </div>
  );
}
