"use client";
import { useEffect, useRef } from "react";
import { Timeline } from "@knight-lab/timelinejs";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import "./timeline-custom.css";

export interface Event {
  start_date: { year: number; month?: number; day?: number };
  text: { headline: string; text?: string };
  group?: string;
  background?: { color?: string; url?: string };
  media?: { url: string; thumbnail?: string };
}

interface MyTimelineComponentProps {
  events: Event[];
}

const MyTimelineComponent = ({ events }: MyTimelineComponentProps) => {
  const timelineRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      const { Timeline } = require("@knight-lab/timelinejs");

      const options = {
        scale_factor: 2,
        timenav_position: "bottom",
        height: "80vh",
        language: "en",
        hash_bookmark: true,
        marker_height_min: 50,
        marker_padding: 5,
        start_at_slide: 0,
        ga_measurement_id: "G-WPG6VTRDW9",
        timenav_height_percentage: 40,
      };

      new Timeline(timelineRef.current, { events }, options);
    }
  }, [events]);

  return <div ref={timelineRef} id="timeline-embed"></div>;
};

export default MyTimelineComponent;
