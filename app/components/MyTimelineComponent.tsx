"use client";
import { useEffect, useRef, useState } from "react";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import { SITE_CONFIG } from "@/app/config/site";
import { TimelineJSEvent } from "@/app/types/timeline";

interface MyTimelineComponentProps {
  title?: TimelineJSEvent;
  events: TimelineJSEvent[];
  font: string;
  scale?: "human" | "cosmological";
}

const MyTimelineComponent = ({
  title,
  events,
  font,
  scale,
}: MyTimelineComponentProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInstance, setTimelineInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      import("@knight-lab/timelinejs").then(({ Timeline }) => {
        if (timelineInstance && timelineRef.current) {
          timelineRef.current.innerHTML = "";
        }

        const options = {
          hash_bookmark: true,
          ga_measurement_id: SITE_CONFIG.GOOGLE_ANALYTICS_ID ?? "",
          duration: 500,
          marker_height_min: 50,
          timenav_height_percentage: 20,
          timenav_mobile_height_percentage: 20,
          font,
        };

        const timeline = new Timeline(
          timelineRef.current!,
          { title: title, events: events, scale: scale },
          options
        );
        setTimelineInstance(timeline);
      });
    }

    return () => {
      if (timelineInstance && timelineRef.current) {
        timelineRef.current.innerHTML = "";
      }
    };
  }, [title, events, font, scale]);

  return <div ref={timelineRef} id="timeline-embed" />;
};

export default MyTimelineComponent;
