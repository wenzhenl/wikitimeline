"use client";
import { useEffect, useRef, useState } from "react";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import { SITE_CONFIG } from "../config/site";
import { TimelineJSEvent } from "@/app/types/timeline";

interface MyTimelineComponentProps {
  events: TimelineJSEvent[];
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
          marker_height_min: 50,
          ga_measurement_id: SITE_CONFIG.GOOGLE_ANALYTICS_ID ?? "",
          duration: 500,
          timenav_height_percentage: 20,
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
