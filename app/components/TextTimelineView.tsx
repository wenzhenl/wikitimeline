"use client";

import { useState, useEffect } from "react";
import { PAGE_DELIMITER } from "@/app/constants";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
  source?: string;
  age?: number;
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

function formatCosmologicalDate(year: number): string {
  const absYear = Math.abs(year);

  // Handle dates within human range differently
  if (absYear <= 275760) {
    const formattedYear =
      absYear >= 10000 ? absYear.toLocaleString() : absYear.toString();
    return year < 0 ? `${formattedYear} BCE` : formattedYear;
  }

  // Format cosmological dates
  let display = "";
  if (absYear >= 1_000_000_000) {
    display = `${(absYear / 1_000_000_000).toFixed(1)} billion`;
  } else if (absYear >= 1_000_000) {
    display = `${(absYear / 1_000_000).toFixed(1)} million`;
  } else {
    display = absYear.toLocaleString();
  }

  const suffix = year < 0 ? "YEARS AGO" : "YEARS IN THE FUTURE";
  return `${display.toUpperCase()} ${suffix}`;
}

export default function TextTimelineView({
  data,
  viewMode = "combined",
  showSource = false,
  activePage = "",
}: TextTimelineViewProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Get the default color scheme
  const defaultScheme = COLOR_SCHEMES[0];

  // Create a map of sources to colors
  const sourceColorMap = new Map<
    string,
    { color: string; textColor: string }
  >();

  // Assign colors to unique sources
  if (data?.timeline) {
    const uniqueSources = Array.from(
      new Set(data.timeline.map((event) => event.source).filter(Boolean))
    );
    uniqueSources.forEach((source, index) => {
      if (source) {
        const colorIndex = index % Object.keys(defaultScheme.colors).length;
        sourceColorMap.set(source, defaultScheme.colors[colorIndex]);
      }
    });
  }

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !data || !data.timeline) {
    // Return null during hydration to prevent flash
    return null;
  }

  // Filter timeline events here based on viewMode and activePage
  const filteredTimeline =
    viewMode === "combined"
      ? data.timeline
      : data.timeline.filter((event) => event.source === activePage);

  // Check if any dates are outside human scale range
  const needsCosmologicalScale = filteredTimeline.some((event) => {
    const year = parseInt(
      event.date.startsWith("-") ? event.date.slice(1) : event.date
    );
    return event.date.startsWith("-") ? year > 271821 : year > 275760;
  });

  // Get unique sources for titles
  const uniqueSources = data?.timeline
    ? Array.from(
        new Set(data.timeline.map((event) => event.source).filter(Boolean))
      )
    : [];

  return (
    <div className="space-y-8">
      {data.titles && uniqueSources.length > 0 ? (
        <div className="mb-8">
          {viewMode === "combined" ? (
            uniqueSources.length > 1 ? (
              // Multiple timelines in combined view
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg p-6 border border-blue-100 dark:border-blue-800/30 shadow-sm">
                {uniqueSources.map((source, index) => (
                  <div
                    key={source}
                    className={
                      index > 0
                        ? "mt-8 pt-6 border-t border-blue-100 dark:border-blue-800/30"
                        : ""
                    }
                  >
                    {data.titles?.[source || ""] && (
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed italic font-serif">
                          {data.titles[source || ""]}
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

      {filteredTimeline.map((event: TimelineEvent, index: number) => {
        const isNegativeYear = event.date.startsWith("-");
        const normalizedDate = isNegativeYear
          ? event.date.slice(1)
          : event.date;
        const dateParts = normalizedDate.split("-");
        const year = parseInt(dateParts[0]) * (isNegativeYear ? -1 : 1);

        const sourceColors = event.source
          ? sourceColorMap.get(event.source)
          : null;

        const showSourceBadge = showSource && event.source;

        return (
          <div
            key={index}
            className={`relative ${
              showSourceBadge ? "pt-6" : "pt-4"
            } pb-6 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700`}
          >
            {showSourceBadge && (
              <div className="absolute -top-px -left-px rounded-tl-lg">
                <span
                  style={{
                    backgroundColor: sourceColors?.color || "#f3f4f6",
                    color: sourceColors?.textColor || "#4b5563",
                  }}
                  className="inline-block px-2 py-1 rounded-tl-lg text-xs"
                >
                  {event.source!.replace(/_/g, " ")}
                </span>
              </div>
            )}
            <div className={`${showSourceBadge ? "mt-4" : "mt-0"}`}>
              <div className="text-sm mb-4">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {needsCosmologicalScale ? (
                    formatCosmologicalDate(year)
                  ) : (
                    <>
                      {Math.abs(year)} {isNegativeYear ? "BCE" : ""}
                      {dateParts[1] &&
                        ` ${new Date(
                          2000,
                          parseInt(dateParts[1]) - 1
                        ).toLocaleString("default", { month: "short" })}`}
                      {dateParts[2] && ` ${parseInt(dateParts[2])}`}
                    </>
                  )}
                </span>
                {event.age !== undefined && event.age > 0 && (
                  <>
                    <span className="text-gray-400 dark:text-gray-500 mx-2">
                      |
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Age {event.age}
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {event.headline}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{event.text}</p>
            </div>
          </div>
        );
      })}

      {data.errors?.failedPages && data.errors.failedPages.length > 0 && (
        <div
          className="
          p-4 
          bg-yellow-50 dark:bg-yellow-900/30 
          rounded-lg 
          border border-yellow-100 dark:border-yellow-900/50
        "
        >
          <p className="text-yellow-800 dark:text-yellow-200">
            Note: Could not include data from:{" "}
            {data.errors.failedPages
              .map((page) => decodeURIComponent(page))
              .join(PAGE_DELIMITER)}
          </p>
        </div>
      )}

      <div
        className="
        mt-8 
        pt-6 
        border-t 
        border-gray-200 dark:border-gray-700
        text-center 
        text-gray-500 dark:text-gray-400 
        text-sm
      "
      >
        ● End of Timeline ●
      </div>
    </div>
  );
}
