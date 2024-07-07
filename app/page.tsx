"use client";

import { useState, FormEvent } from "react";

export default function HomePage() {
  const [wikiLink, setWikiLink] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = new URL(wikiLink);
    const pathSegments = url.pathname.split("/");
    const pageName = pathSegments[pathSegments.length - 1];
    const subdomain = url.hostname.split(".")[0];

    let lang = subdomain;
    if (url.hostname === "wikipedia.org") {
      lang = "en";
    }

    const isLocalhost = window.location.hostname === "localhost";
    const newUrl = isLocalhost
      ? `http://${lang}.localhost:3000/timeline/${pageName}`
      : `https://${lang}.wikitimeline.top/timeline/${pageName}`;

    window.location.href = newUrl;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
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
      </div>
    </div>
  );
}
