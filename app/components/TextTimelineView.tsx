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

      {data.timeline.map((event: TimelineEvent, index: number) => (
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
              {event.date}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {event.headline}
          </h3>
          <p className="text-gray-700 dark:text-gray-300">{event.text}</p>
        </div>
      ))}

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
