"use client";

import MyTimelineComponent from "@/app/components/MyTimelineComponent";
import { formatTimelineEventsForInteractive } from "@/app/utils/formatTimelineEvents";
import { TimelinePageResult } from "@/app/types/timeline";

export default function EmbeddedTimeline({
  timelines,
}: {
  timelines: Record<string, TimelinePageResult>;
}) {
  const formattedData = formatTimelineEventsForInteractive(timelines);

  return (
    <div className="w-full h-screen">
      {Object.keys(timelines).length > 0 && (
        <MyTimelineComponent
          title={formattedData.title}
          events={formattedData.events}
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
