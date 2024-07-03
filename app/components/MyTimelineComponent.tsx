"use client";
import { useEffect, useRef } from "react";
import { Timeline } from "@knight-lab/timelinejs";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import "@knight-lab/timelinejs/src/less/TL.Timeline.less";
import "./timeline-custom.css"; // Import the custom CSS

const MyTimelineComponent = () => {
  const timelineRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      const options = {
        initial_zoom: 2,
        timenav_position: "bottom",
        height: 600,
        language: "en",
        hash_bookmark: true,
        marker_height_min: 30,
        marker_padding: 5,
        start_at_slide: 0,
      };

      new Timeline(
        timelineRef.current,
        {
          events: [
            {
              start_date: { year: 1907, month: 12, day: 5 },
              text: {
                headline: "Born",
                text: "Lin Yurong was born in Huanggang, Hubei, Qing Empire.",
              },
              background: { color: "#0f9bd1" },
              group: "林彪",
            },
            {
              start_date: { year: 1917 },
              text: { headline: "Enrolled in primary school" },
              group: "林彪",
            },
            {
              start_date: { year: 1919 },
              text: { headline: "Moved to Shanghai to continue education" },
              group: "林彪",
            },
            {
              start_date: { year: 1905, month: 2, day: 5 },
              text: {
                headline: "Born",
                text: "Mao Zedong is Born",
              },
              background: { color: "#0f9bd1" },
              group: "毛泽东",
            },
            {
              start_date: { year: 1920 },
              text: { headline: "Start fucking" },
              group: "毛泽东",
            },
            {
              start_date: { year: 1923 },
              text: { headline: "Nothing to do" },
              group: "毛泽东",
            },
          ],
        },
        options
      );
    }
  }, []);

  return <div ref={timelineRef} id="timeline-embed"></div>;
};

export default MyTimelineComponent;
