"use client";

import { useState, useEffect } from "react";
import { PAGE_DELIMITER } from "@/app/constants";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
  source?: string;
}

interface TextTimelineViewProps {
  data: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  } | null;
  viewMode?: "combined" | "tabs";
  showSource?: boolean;
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
}: TextTimelineViewProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !data || !data.timeline) {
    // Return null during hydration to prevent flash
    return null;
  }

  // Check if any dates are outside human scale range
  const needsCosmologicalScale = data.timeline.some((event) => {
    const year = parseInt(
      event.date.startsWith("-") ? event.date.slice(1) : event.date
    );
    return event.date.startsWith("-") ? year > 271821 : year > 275760;
  });

  return (
    <div className="space-y-8">
      <p
        className="
        text-gray-600 dark:text-gray-400
        text-sm
        mb-6
      "
      >
        A chronological timeline generated from Wikipedia content, showing key
        dates and events in order.
      </p>

      {data.timeline.map((event: TimelineEvent, index: number) => {
        const isNegativeYear = event.date.startsWith("-");
        const normalizedDate = isNegativeYear
          ? event.date.slice(1)
          : event.date;
        const dateParts = normalizedDate.split("-");
        const year = parseInt(dateParts[0]) * (isNegativeYear ? -1 : 1);

        return (
          <div
            key={index}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="text-sm mb-2 flex items-center">
              {showSource && (
                <span className="mr-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
                  {event.source}
                </span>
              )}
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
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {event.headline}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{event.text}</p>
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
