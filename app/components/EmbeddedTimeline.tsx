"use client";

import MyTimelineComponent from "./MyTimelineComponent";
import { formatTimelineEvents } from "@/app/utils/formatTimelineEvents";
import type { TimelineEvent } from "../timeline/[pageName]/page";

export default function EmbeddedTimeline({
  events,
}: {
  events: TimelineEvent[];
}) {
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
          color: #4b5563 !important;
          text-shadow: none !important;
          font-weight: 500 !important;
          opacity: 0.9 !important;
        }
      `}</style>
    </div>
  );
}
