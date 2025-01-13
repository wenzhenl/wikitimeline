"use client";

import MyTimelineComponent from "./MyTimelineComponent";
import { formatTimelineEventsForInteractive } from "@/app/utils/formatTimelineEvents";
import { PageTimeline } from "@/app/types/timeline";

export default function EmbeddedTimeline({
  timelines,
}: {
  timelines: Record<string, PageTimeline>;
}) {
  return (
    <div className="w-full h-screen">
      {Object.keys(timelines).length > 0 && (
        <MyTimelineComponent
          events={formatTimelineEventsForInteractive(timelines)}
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
