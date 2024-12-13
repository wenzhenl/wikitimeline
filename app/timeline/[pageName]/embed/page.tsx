"use client";

import { useEffect, useState } from "react";
import MyTimelineComponent from "../../../components/MyTimelineComponent";
import { TimelineEvent } from "../page";
import { formatTimelineEvents } from "@/app/utils/formatTimelineEvents";

export default function EmbedTimelinePage({
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
    <div className="h-full w-full">
      <MyTimelineComponent events={formatTimelineEvents(events)} />
    </div>
  );
}
