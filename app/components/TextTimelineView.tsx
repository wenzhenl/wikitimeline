"use client";

import { useState, useEffect } from "react";
import { memo } from "react";

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

interface TimelineEventCardProps {
  event: TimelineEvent;
}

// Memoize the event card component
const TimelineEventCard = memo(({ event }: TimelineEventCardProps) => {
  const isNegativeYear = event.date.startsWith("-");
  const normalizedDate = isNegativeYear ? event.date.slice(1) : event.date;
  const dateParts = normalizedDate.split("-");
  const year = parseInt(dateParts[0]);

  return (
    <article
      className="
        p-6 
        bg-white dark:bg-gray-800 
        rounded-lg 
        shadow-sm
        border border-gray-100 dark:border-gray-700
        hover:shadow-md 
        transition-shadow 
        duration-200
      "
    >
      <time
        className="
          block 
          mb-3
          text-lg 
          font-semibold 
          text-blue-600 dark:text-blue-400
        "
      >
        {year} {isNegativeYear ? "BC" : ""}
        {dateParts[1] &&
          ` ${new Date(2000, parseInt(dateParts[1]) - 1).toLocaleString(
            "default",
            { month: "short" }
          )}`}
        {dateParts[2] && ` ${parseInt(dateParts[2])}`}
      </time>

      <h2
        className="
          text-xl 
          font-bold 
          text-gray-900 dark:text-white 
          mb-3
        "
      >
        {event.headline}
      </h2>

      {event.text && (
        <p
          className="
            text-gray-700 dark:text-gray-300
            leading-relaxed
          "
        >
          {event.text}
        </p>
      )}
    </article>
  );
});

TimelineEventCard.displayName = "TimelineEventCard";

export default function TextTimelineView({ data }: TextTimelineViewProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    setIsHydrated(true);

    // Progressive loading of events
    if (data?.timeline) {
      // Load first batch immediately
      setVisibleEvents(data.timeline.slice(0, 5));

      // Load the rest after hydration
      if (data.timeline.length > 5) {
        const timer = setTimeout(() => {
          setVisibleEvents(data.timeline);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [data?.timeline]);

  if (!isHydrated || !data || !data.timeline) {
    // Return null during hydration to prevent flash
    return null;
  }

  return (
    <div className="space-y-6">
      {visibleEvents.map((event, index) => (
        <TimelineEventCard key={`${event.date}-${index}`} event={event} />
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
            {data.errors.failedPages.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
