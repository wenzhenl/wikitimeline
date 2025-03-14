"use client";

import MyTimelineComponent from "@/app/components/MyTimelineComponent";
import { formatTimelineEventsForInteractive } from "@/app/utils/formatTimelineEvents";
import { TimelinePageResult } from "@/app/types/timeline";
import { ERROR_MESSAGES } from "@/app/constants/errorMessages";

// Error component for embedded view
function ErrorDisplay({ message = ERROR_MESSAGES.TIMELINE_GENERATION_ERROR }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-6 max-w-md">
        <div className="mb-4 text-yellow-500">
          <svg
            className="h-12 w-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Timeline could not be displayed
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
}

export default function EmbeddedTimeline({
  timelines,
}: {
  timelines: Record<string, TimelinePageResult>;
}) {
  try {
    // Filter out unsuccessful timelines
    const successfulTimelines: Record<string, TimelinePageResult> = {};
    Object.entries(timelines).forEach(([pageName, result]) => {
      if (result.status === "success" && result.timeline) {
        successfulTimelines[pageName] = result;
      }
    });

    // Check if we have any successful timelines
    if (Object.keys(successfulTimelines).length === 0) {
      return <ErrorDisplay />;
    }

    const formattedData =
      formatTimelineEventsForInteractive(successfulTimelines);

    // Check if we have any events
    if (!formattedData.events || formattedData.events.length === 0) {
      return <ErrorDisplay message="No timeline events found." />;
    }

    return (
      <div className="w-full h-screen">
        <MyTimelineComponent
          title={formattedData.title}
          events={formattedData.events}
          font="default"
        />
        <style jsx global>{`
          .tl-slide-content
            .tl-text
            .tl-text-content-container
            .tl-text-headline-container
            .tl-headline-date,
          .tl-text .tl-headline-date {
            color: #4b5563 !important;
            text-shadow: none !important;
            font-weight: 500 !important;
            opacity: 0.9 !important;
          }
        `}</style>
      </div>
    );
  } catch (error) {
    console.error("Error in EmbeddedTimeline:", error);
    return <ErrorDisplay />;
  }
}
