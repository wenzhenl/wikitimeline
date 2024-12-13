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
        />
      )}
    </div>
  );
}
