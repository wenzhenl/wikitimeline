"use client";
import { useEffect, useRef } from "react";
import { Timeline } from "@knight-lab/timelinejs";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import "@knight-lab/timelinejs/src/less/TL.Timeline.less";
import "./timeline-custom.css"; // Import the custom CSS

const MyTimelineComponent = ({ events }) => {
  const timelineRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      const { Timeline } = require("@knight-lab/timelinejs");

      const options = {
        initial_zoom: 1,
        timenav_position: "top",
        height: 600,
        language: "zh",
        hash_bookmark: true,
        marker_height_min: 30,
        marker_padding: 5,
        start_at_slide: 0,
      };

      new Timeline(timelineRef.current, { events }, options);
    }
  }, [events]);

  return <div ref={timelineRef} id="timeline-embed"></div>;
};

export default MyTimelineComponent;
