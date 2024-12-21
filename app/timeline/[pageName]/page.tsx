"use client";

import { useEffect, useState } from "react";
import MyTimelineComponent from "../../components/MyTimelineComponent";
import Link from "next/link";
import logger from "@/app/utils/logger";
import { formatTimelineEvents } from "@/app/utils/formatTimelineEvents";

export interface TimelineEvent {
  date: string;
  text: {
    headline: string;
    text: string;
  };
  group: string;
  media: {
    url: string;
    thumbnail?: string;
  };
}

// Add new interface for API response
interface TimelineResponse {
  timeline: TimelineEvent[];
  errors?: {
    message: string;
    failedPages: string[];
    details?: {
      noWikipediaData: string[];
      noTimelineGenerated: string[];
    };
  };
}

const ShareDialog = ({
  isOpen,
  onClose,
  pageName,
}: {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
}) => {
  const [copyStatus, setCopyStatus] = useState("Copy embed code");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopyStatus("Copied!");
      setTimeout(() => {
        setCopyStatus("Copy embed code");
      }, 2000); // Reset after 2 seconds
    } catch (err) {
      setCopyStatus("Failed to copy");
      setTimeout(() => {
        setCopyStatus("Copy embed code");
      }, 2000);
    }
  };

  const embedCode = `<iframe width="1200" height="600" src="${window.location.origin}/timeline/${pageName}/embed" title="Timeline player" frameborder="0"></iframe>`;
  const pageUrl = `${window.location.origin}/timeline/${pageName}`;
  const shareText = `Check out this interactive timeline about ${decodeURIComponent(
    pageName
  )
    .replace(/_/g, " ")
    .replace(/,/g, ", ")}!`;

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full relative z-[10000]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Share</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              shareText
            )}&url=${encodeURIComponent(pageUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X
          </a>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(
              pageUrl
            )}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b3]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.03-.74 4.03-1.75 6.72-2.91 8.07-3.48 3.85-1.63 4.64-1.91 5.17-1.92.11 0 .37.03.54.18.17.15.21.36.23.5-.01.14.01.51-.01.51z" />
            </svg>
            Telegram
          </a>

          <a
            href={`https://www.reddit.com/submit?url=${encodeURIComponent(
              pageUrl
            )}&title=${encodeURIComponent(shareText)}&sr=wikipedia`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 bg-[#FF4500] text-white rounded-lg hover:bg-[#e03d00]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            Reddit
          </a>
        </div>

        <div className="border-t dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Embed this timeline
          </p>
          <input
            type="text"
            value={embedCode}
            readOnly
            onClick={(e) => e.currentTarget.select()}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 text-sm font-mono mb-2"
          />
          <button
            onClick={handleCopy}
            className={`w-full py-2 ${
              copyStatus === "Copied!"
                ? "bg-green-500 hover:bg-green-600"
                : copyStatus === "Failed to copy"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white rounded transition-colors duration-200`}
          >
            {copyStatus}
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default function TimelinePage({
  params,
}: {
  params: { pageName: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [skippedPages, setSkippedPages] = useState<string[]>([]);
  const [showEmbed, setShowEmbed] = useState(false);

  // Create a map to store group indices
  const groupIndices = new Map<string, number>();

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/wikipedia/${params.pageName}`);
        if (!response.ok) {
          throw new Error("Failed to fetch timeline data");
        }

        const data: TimelineResponse = await response.json();

        if (data.timeline.length === 0) {
          throw new Error(
            data.errors?.message || "No timeline events could be generated"
          );
        }

        setEvents(data.timeline);
        if (data.errors?.failedPages) {
          setSkippedPages(data.errors.failedPages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [params.pageName]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeenSwipeTip = localStorage.getItem("hasSeenSwipeTip");
      if (!hasSeenSwipeTip) {
        // For first-time users, add click listener immediately
        const messageContainer = document.querySelector(".tl-message-full");
        if (messageContainer) {
          messageContainer.addEventListener("click", () => {
            localStorage.setItem("hasSeenSwipeTip", "true");
          });
        }
      } else {
        // For returning users, hide the tip with minimal delay
        setTimeout(() => {
          const messageContainer = document.querySelector(".tl-message-full");
          if (messageContainer) {
            (messageContainer as HTMLElement).style.display = "none";
          }
        }, 1000);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
          Generating Timeline...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
          Please wait while we analyze and process the Wikipedia content into a
          beautiful timeline
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
            >
              WikiTimeline
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={`/timeline/${params.pageName}/text`}
                className="text-blue-600 hover:text-blue-800"
              >
                View Text Version
              </Link>
              <button
                onClick={() => setShowEmbed(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
        </div>

        {/* Title Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
              {decodeURIComponent(params.pageName)
                .split(",")
                .map((name, index) => (
                  <span key={name}>
                    <a
                      href={`https://wikipedia.org/wiki/${name.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline cursor-pointer"
                      title={`View "${name
                        .trim()
                        .replace(/_/g, " ")}" on Wikipedia`}
                    >
                      {name.trim().replace(/_/g, " ")}
                    </a>
                    {index <
                    decodeURIComponent(params.pageName).split(",").length - 1
                      ? ", "
                      : ""}
                  </span>
                ))}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Interactive timeline generated from Wikipedia content
            </p>
            {skippedPages.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Could not generate timeline for: {skippedPages.join(", ")}
                  <br />
                  <span className="text-sm">
                    These pages might not exist on Wikipedia or might not
                    contain enough timeline data.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Section - Full width */}
        {events.length > 0 && (
          <div className="w-full h-[800px]">
            <MyTimelineComponent events={formatTimelineEvents(events)} />
          </div>
        )}
      </main>

      <style jsx global>{`
        .tl-slide-content
          .tl-text
          .tl-text-content-container
          .tl-text-headline-container
          .tl-headline-date,
        .tl-text .tl-headline-date {
          color: #4b5563 !important; /* gray-600 for better visibility */
          text-shadow: none !important;
          font-weight: 500 !important;
          opacity: 0.9 !important;
        }
      `}</style>

      <ShareDialog
        isOpen={showEmbed}
        onClose={() => setShowEmbed(false)}
        pageName={params.pageName}
      />
    </div>
  );
}
