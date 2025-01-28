"use client";

import { useState, useEffect } from "react";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TextTimelineViewProps {
  data: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  } | null;
}

export default function TextTimelineView({ data }: TextTimelineViewProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !data || !data.timeline) {
    // Return null during hydration to prevent flash
    return null;
  }

  return (
    <div className="space-y-8">
      {data.timeline.map((event, index) => {
        const isNegativeYear = event.date.startsWith("-");
        const normalizedDate = isNegativeYear
          ? event.date.slice(1)
          : event.date;
        const dateParts = normalizedDate.split("-");
        const year = parseInt(dateParts[0]);

        return (
          <article key={index} className="space-y-2">
            <time className="block text-lg font-semibold text-blue-600 dark:text-blue-400">
              {year} {isNegativeYear ? "BC" : ""}
              {dateParts[1] &&
                ` ${new Date(2000, parseInt(dateParts[1]) - 1).toLocaleString(
                  "default",
                  { month: "short" }
                )}`}
              {dateParts[2] && ` ${parseInt(dateParts[2])}`}
            </time>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {event.headline}
            </h2>

            {event.text && (
              <p className="text-gray-700 dark:text-gray-300">{event.text}</p>
            )}
          </article>
        );
      })}

      {data.errors?.failedPages && data.errors.failedPages.length > 0 && (
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Note: Could not include data from:{" "}
            {data.errors.failedPages.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
