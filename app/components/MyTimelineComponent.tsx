"use client";
import { useEffect, useRef, useState } from "react";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import { SITE_CONFIG } from "../config/site";

export interface Event {
  start_date: { year: number; month?: number; day?: number };
  text: { headline: string; text?: string };
  group?: string;
  background?: { color?: string; url?: string };
  media?: { url: string; thumbnail?: string };
}

interface MyTimelineComponentProps {
  events: Event[];
  font: string;
}

const MyTimelineComponent = ({ events, font }: MyTimelineComponentProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInstance, setTimelineInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      import("@knight-lab/timelinejs").then(({ Timeline }) => {
        if (timelineInstance && timelineRef.current) {
          timelineRef.current.innerHTML = "";
        }

        const options = {
          scale_factor: 2,
          height: "600px",
          language: "en",
          hash_bookmark: true,
          marker_height_min: 50,
          marker_padding: 5,
          start_at_slide: 0,
          ga_measurement_id: SITE_CONFIG.GOOGLE_ANALYTICS_ID ?? "",
          timenav_height_percentage: 20,
          duration: 500,
          font,
        };

        const timeline = new Timeline(
          timelineRef.current!,
          { events },
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
  }, [events, font]);

  return <div ref={timelineRef} id="timeline-embed" />;
};

export default MyTimelineComponent;
