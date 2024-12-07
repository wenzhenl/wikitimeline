"use client";

import { useEffect, useState } from "react";
import MyTimelineComponent from "../../components/MyTimelineComponent";
import Link from "next/link";

interface TimelineEvent {
  date: string;
  text: string;
  group: string;
  media: {
    url: string;
    thumbnail?: string;
  };
}

// Define background colors for different groups with better contrast
const GROUP_COLORS = {
  0: {
    color: "#EFF6FF",
    darkColor: "#1E3A8A",
    textColor: "#1E40AF", // blue-800
    darkTextColor: "#DBEAFE", // blue-100
  },
  1: {
    color: "#FFF1F2",
    darkColor: "#881337",
    textColor: "#9F1239", // rose-800
    darkTextColor: "#FFE4E6", // rose-100
  },
  2: {
    color: "#ECFDF5",
    darkColor: "#064E3B",
    textColor: "#065F46", // green-800
    darkTextColor: "#D1FAE5", // green-100
  },
  3: {
    color: "#F5F3FF",
    darkColor: "#5B21B6",
    textColor: "#6D28D9", // violet-800
    darkTextColor: "#EDE9FE", // violet-100
  },
  4: {
    color: "#FFFBEB",
    darkColor: "#92400E",
    textColor: "#B45309", // amber-800
    darkTextColor: "#FEF3C7", // amber-100
  },
  5: {
    color: "#EEF2FF",
    darkColor: "#3730A3",
    textColor: "#4338CA", // indigo-800
    darkTextColor: "#E0E7FF", // indigo-100
  },
  6: {
    color: "#F0FDFA",
    darkColor: "#134E4A",
    textColor: "#115E59", // teal-800
    darkTextColor: "#CCFBF1", // teal-100
  },
  7: {
    color: "#FDF2F8",
    darkColor: "#9D174D",
    textColor: "#BE185D", // pink-800
    darkTextColor: "#FCE7F3", // pink-100
  },
  8: {
    color: "#FAF5FF",
    darkColor: "#6B21A8",
    textColor: "#7E22CE", // purple-800
    darkTextColor: "#F3E8FF", // purple-100
  },
  9: {
    color: "#F8FAFC",
    darkColor: "#0F172A",
    textColor: "#1E293B", // slate-800
    darkTextColor: "#F1F5F9", // slate-100
  },
};

export default function TimelinePage({
  params,
}: {
  params: { pageName: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

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

        const data = await response.json();
        console.log("Received timeline data:", JSON.stringify(data, null, 2));
        if (data.error) {
          throw new Error(data.error);
        }

        setEvents(data.timeline);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [params.pageName]);

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
                href="/"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
              >
                New Timeline
              </Link>
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
          </div>
        </div>

        {/* Timeline Section - Full width */}
        <div className="w-full h-[800px]">
          <MyTimelineComponent
            events={events.map((event) => {
              const [year, month, day] = event.date.split("-").map(Number);

              // Assign a consistent index to each group
              if (!groupIndices.has(event.group)) {
                groupIndices.set(event.group, groupIndices.size);
              }
              const groupIndex = groupIndices.get(event.group)!;
              const colors =
                GROUP_COLORS[groupIndex as keyof typeof GROUP_COLORS] ||
                GROUP_COLORS[0];

              return {
                start_date: { year, month, day },
                text: {
                  headline: `<span style="color: ${
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? colors.darkTextColor
                      : colors.textColor
                  }; font-weight: 600;">${event.text}</span>`,
                  text: `<span style="color: ${
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? colors.darkTextColor
                      : colors.textColor
                  };">${event.text}</span>`,
                },
                group: event.group,
                media: event.media,
                background: {
                  color: window.matchMedia("(prefers-color-scheme: dark)")
                    .matches
                    ? colors.darkColor
                    : colors.color,
                },
              };
            })}
          />
        </div>
      </main>
    </div>
  );
}
