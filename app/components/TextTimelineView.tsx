"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { PAGE_DELIMITER } from "@/app/constants";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";
import { formatPageName } from "@/app/utils/helper";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
  source?: string;
  age?: number;
}

interface SourceColors {
  color: string;
  textColor: string;
}

interface TextTimelineViewProps {
  data: {
    timeline: TimelineEvent[];
    titles?: Record<string, string>;
    errors?: {
      failedPages: string[];
      message?: string;
      details?: {
        noWikipediaData: string[];
        noTimelineGenerated: string[];
      };
    };
  } | null;
  viewMode?: "combined" | "tabs";
  showSource?: boolean;
  activePage?: string;
}

// Function to format date for display
function formatDate(dateStr: string): string {
  const isNegativeYear = dateStr.startsWith("-");
  const normalizedDate = isNegativeYear ? dateStr.slice(1) : dateStr;
  const dateParts = normalizedDate.split("-");
  const year = parseInt(dateParts[0]);

  if (isNegativeYear) {
    return `${year} BCE${
      dateParts[1]
        ? `-${new Date(2000, parseInt(dateParts[1]) - 1).toLocaleString(
            "default",
            { month: "short" }
          )}`
        : ""
    }${dateParts[2] ? `-${parseInt(dateParts[2])}` : ""}`;
  } else {
    return `${year}${
      dateParts[1]
        ? `-${new Date(2000, parseInt(dateParts[1]) - 1).toLocaleString(
            "default",
            { month: "short" }
          )}`
        : ""
    }${dateParts[2] ? `-${parseInt(dateParts[2])}` : ""}`;
  }
}

function formatCosmologicalDate(year: number): string {
  if (year >= 1000000000) {
    return `${(year / 1000000000).toFixed(1)} billion years ago`;
  } else if (year >= 1000000) {
    return `${(year / 1000000).toFixed(1)} million years ago`;
  } else if (year >= 10000) {
    return `${(year / 1000).toFixed(1)} thousand years ago`;
  } else {
    return year.toString();
  }
}

export default function TextTimelineView({
  data,
  viewMode = "combined",
  showSource = false,
  activePage = "",
}: TextTimelineViewProps) {
  // Add state for tracking which timeline item is in focus
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const timelineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter timeline based on active page in tabs mode
  const filteredTimeline = useMemo(() => {
    if (!data?.timeline) return [];

    if (viewMode === "tabs" && activePage) {
      return data.timeline.filter((event) => event.source === activePage);
    }

    return data.timeline;
  }, [data, viewMode, activePage]);

  // Set up intersection observer to track which timeline item is in view
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = timelineRefs.current.findIndex(
            (ref) => ref === entry.target
          );
          if (index !== -1) {
            if (entry.isIntersecting) {
              setFocusedIndex(index);
            } else if (focusedIndex === index) {
              setFocusedIndex(null);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0,
      }
    );

    timelineRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [filteredTimeline.length, focusedIndex]);

  // Get unique sources for combined view
  const uniqueSources = useMemo(() => {
    if (!data?.timeline) return [];

    const sources = data.timeline
      .map((event) => event.source)
      .filter((source): source is string => !!source);

    return Array.from(new Set(sources));
  }, [data]);

  // Generate colors for sources
  const sourceColorMap = useMemo(() => {
    const colors: Record<string, SourceColors> = {};
    const baseColors = [
      { color: "#e0f2fe", textColor: "#0369a1" }, // blue
      { color: "#f0fdf4", textColor: "#166534" }, // green
      { color: "#fef3c7", textColor: "#92400e" }, // amber
      { color: "#fce7f3", textColor: "#9d174d" }, // pink
      { color: "#f3e8ff", textColor: "#7e22ce" }, // purple
    ];

    uniqueSources.forEach((source, index) => {
      colors[source] = baseColors[index % baseColors.length];
    });

    return colors;
  }, [uniqueSources]);

  // Check if we need cosmological scale
  const needsCosmologicalScale = useMemo(() => {
    if (!data?.timeline) return false;

    return data.timeline.some((event) => {
      const isNegativeYear = event.date.startsWith("-");
      const normalizedDate = isNegativeYear ? event.date.slice(1) : event.date;
      const dateParts = normalizedDate.split("-");
      const year = parseInt(dateParts[0]);
      return year >= 10000;
    });
  }, [data]);

  // Show source badge if in combined view with multiple sources
  const showSourceBadge = viewMode === "combined" && uniqueSources.length > 1;

  if (!data) {
    return (
      <div className="text-gray-600 dark:text-gray-400 text-sm">
        No timeline data available.
      </div>
    );
  }

  return (
    <div className="w-full">
      {data.titles && uniqueSources.length > 0 ? (
        <div className="mb-8">
          {viewMode === "combined" ? (
            uniqueSources.length > 1 ? (
              // Multiple timelines in combined view
              <div className="space-y-4">
                {uniqueSources.map((source) => (
                  <div
                    key={source}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-800/30 shadow-sm"
                  >
                    {data.titles?.[source] && (
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor:
                              sourceColorMap[source]?.color || "#f3f4f6",
                          }}
                        ></div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                          {formatPageName(source).formattedName}:{" "}
                          <span className="italic font-serif">
                            {data.titles[source]}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Single timeline in combined view
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg p-6 border border-blue-100 dark:border-blue-800/30 shadow-sm">
                {data.titles?.[uniqueSources[0] || ""] && (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed italic font-serif">
                      {data.titles[uniqueSources[0] || ""]}
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            // Tabs view (single timeline active)
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg p-6 border border-blue-100 dark:border-blue-800/30 shadow-sm">
              {data.titles?.[activePage] && (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed italic font-serif">
                    {data.titles[activePage]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          A chronological timeline generated from Wikipedia content, showing key
          dates and events in order.
        </p>
      )}

      {/* Timeline with connected events and left-side time ticker */}
      <div className="relative mt-8">
        {/* Continuous vertical line spanning the entire timeline */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-200 dark:bg-blue-800"></div>

        {filteredTimeline.map((event: TimelineEvent, index: number) => {
          const isNegativeYear = event.date.startsWith("-");
          const normalizedDate = isNegativeYear
            ? event.date.slice(1)
            : event.date;
          const dateParts = normalizedDate.split("-");
          const year = parseInt(dateParts[0]) * (isNegativeYear ? -1 : 1);

          // Format the date for display
          const displayDate = needsCosmologicalScale
            ? formatCosmologicalDate(Math.abs(year))
            : formatDate(event.date);

          // Determine if this is a BCE date for styling
          const isBCE = isNegativeYear;

          const sourceColors = event.source
            ? sourceColorMap[event.source]
            : undefined;

          const isFocused = focusedIndex === index;

          return (
            <div
              key={index}
              className="flex mb-8 relative group"
              ref={(el) => {
                timelineRefs.current[index] = el;
              }}
            >
              {/* Left side time ticker with dot */}
              <div className="w-12 flex-shrink-0 relative mr-4">
                <div
                  className={`absolute top-[1.375rem] left-1/2 w-4 h-4 rounded-full -ml-2 z-10 shadow-md transition-all duration-300 ${
                    isFocused
                      ? `bg-blue-500 dark:bg-blue-400`
                      : `bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400`
                  }`}
                ></div>
              </div>

              {/* Event card */}
              <div className="flex-grow relative">
                {/* Horizontal connector line from dot to card */}
                <div className="absolute top-[1.375rem] left-[-2.5rem] w-[2.5rem] h-0.5 bg-blue-200 dark:bg-blue-800"></div>
                <div
                  className={`
                  rounded-lg p-5 shadow-md border transition-all duration-300
                  ${isFocused ? "ring-2 ring-blue-300 dark:ring-blue-700" : ""}
                  ${
                    isBCE
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800/30"
                      : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800/30"
                  }
                `}
                >
                  {/* Date and Age at the top of the card */}
                  <div className="flex items-center justify-between mb-3 text-xs text-gray-500 dark:text-gray-400">
                    <div
                      className={`font-mono ${
                        isBCE
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {displayDate}
                    </div>
                    {event.age !== undefined && <div>Age: {event.age}</div>}
                  </div>

                  {showSourceBadge && event.source && (
                    <div className="absolute -top-px -right-px rounded-tr-lg rounded-bl-lg overflow-hidden">
                      <span
                        style={{
                          backgroundColor: sourceColors?.color || "#f3f4f6",
                          color: sourceColors?.textColor || "#4b5563",
                        }}
                        className="inline-block px-2 py-1 text-xs"
                      >
                        {formatPageName(event.source).formattedName}
                      </span>
                    </div>
                  )}
                  <h3
                    className={`text-lg font-semibold mb-2 ${
                      isBCE
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-blue-800 dark:text-blue-300"
                    }`}
                  >
                    {event.headline}
                  </h3>
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <p className="text-gray-700 dark:text-gray-300">
                      {event.text}
                    </p>
                  </div>
                  {showSource && event.source && !showSourceBadge && (
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Source: {formatPageName(event.source).formattedName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Final dot at the end of timeline */}
        {filteredTimeline.length > 0 && (
          <div className="flex relative">
            <div className="w-12 flex-shrink-0 relative mr-4">
              <div className="absolute top-[1.375rem] left-1/2 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 -ml-2 z-10 shadow-md"></div>
            </div>
            <div className="flex-grow">
              <div className="text-sm text-gray-500 dark:text-gray-400 pt-5 pl-2">
                End of timeline
              </div>
            </div>
          </div>
        )}
      </div>

      {data.errors?.failedPages && data.errors.failedPages.length > 0 && (
        <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-lg">
          <h3 className="text-red-800 dark:text-red-300 font-medium mb-2">
            Some pages failed to generate timelines
          </h3>
          <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400">
            {data.errors.failedPages.map((page, index) => (
              <li key={index}>{formatPageName(page).formattedName}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
