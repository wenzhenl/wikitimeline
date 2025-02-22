"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAGE_DELIMITER } from "@/app/constants";

interface SelectedPage {
  title: string;
  link: string;
}

export default function HomePage() {
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
    router.push(
      `/timeline/${pageNames.join(encodeURIComponent(PAGE_DELIMITER))}`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="flex justify-between items-center h-16"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
            >
              WikiTimeline
            </Link>
            <Link
              href="/about"
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              About
            </Link>
          </div>
        </div>
      </nav>

      <footer className="py-8 mt-auto border-t border-gray-200 dark:border-gray-800 min-h-[200px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="flex flex-col items-center gap-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              className="flex items-center space-x-6"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <a
                href="https://github.com/wenzhenl/wikitimeline"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
              >
                <span className="inline-block w-5 h-5">
                  <svg
                    className="h-5 w-5"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504..."
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                GitHub
              </a>
              <a
                href="https://twitter.com/wiki_timeline"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
              >
                <span className="inline-block w-5 h-5">
                  <svg
                    className="h-5 w-5"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
                Twitter
              </a>
              <a
                href="https://www.youtube.com/channel/UCXRW8dB4glrGEH2G16W5Fkg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
              >
                <span className="inline-block w-5 h-5">
                  <svg
                    className="h-5 w-5"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 12s0-3.93-.502-5.814z" />
                    <path
                      fill="white"
                      d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                    />
                  </svg>
                </span>
                YouTube
              </a>
              <a
                href="https://www.reddit.com/r/WikiTimeline"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
              >
                <span className="inline-block w-5 h-5">
                  <svg
                    className="h-5 w-5"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488..." />
                  </svg>
                </span>
                Reddit
              </a>
            </div>
            <div
              className="flex flex-col items-center gap-2 text-sm"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <a
                href="https://x.com/organic_program"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
              >
                Built by Steven Lee (@organic_program)
              </a>
              <div className="text-gray-500 dark:text-gray-400">
                © 2025 WikiTimeline. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
