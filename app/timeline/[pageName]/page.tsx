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

const EmbedDialog = ({ isOpen, onClose, pageName }: { isOpen: boolean; onClose: () => void; pageName: string }) => {
  const embedCode = `<iframe width="560" height="315" src="${window.location.origin}/timeline/${pageName}/embed" title="Timeline player" frameborder="0"></iframe>`;

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Share</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={embedCode}
            readOnly
            onClick={(e) => e.currentTarget.select()}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 text-sm font-mono"
          />
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(embedCode)}
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Copy embed code
        </button>
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
                Embed
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
                .replace(/_/g, " ")
                .replace(/,/g, ", ")}
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
            <MyTimelineComponent
              events={formatTimelineEvents(events)}
            />
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

      <EmbedDialog
        isOpen={showEmbed}
        onClose={() => setShowEmbed(false)}
        pageName={params.pageName}
      />
    </div>
  );
}
