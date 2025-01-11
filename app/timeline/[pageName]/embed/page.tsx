"use client";

import MyTimelineComponent from "@/app/components/MyTimelineComponent";
import { formatTimelineEvents } from "@/app/utils/formatTimelineEvents";
import { useEffect, useState } from "react";
import type { TimelineEvent } from "../page";

export default function EmbedPage({
  params,
}: {
  params: { pageName: string };
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const fetchTimelineData = async () => {
      const response = await fetch(`/api/wikipedia/${params.pageName}`);
      const data = await response.json();
      setEvents(data.timeline);
    };

    fetchTimelineData();
  }, [params.pageName]);

  return (
    <div className="w-full h-screen">
      {events.length > 0 && (
        <MyTimelineComponent
          events={formatTimelineEvents(events)}
          font="default"
        />
      )}
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
    </div>
  );
}
