"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps, Step } from "react-joyride";
import { STATUS } from "react-joyride";
import { isMobile } from "@/app/utils/deviceDetection";

// Dynamically import Joyride with no SSR
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface TimelineTourProps {
  isTimelineInitialized: boolean;
  onSpeedDialClick?: () => void;
}

export default function TimelineTour({
  isTimelineInitialized,
  onSpeedDialClick,
}: TimelineTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Define tour steps
  const steps: Step[] = [
    {
      target: ".tl-storyslider",
      content:
        "Welcome to your interactive timeline! Let's explore how to navigate through it.",
      placement: "center",
      disableBeacon: true,
      title: "Timeline Navigation Guide",
    },
    {
      target: ".tl-menubar",
      content: isMobile()
        ? "Swipe left or right to navigate between events, or use these arrows to move between slides."
        : "Use the left and right arrow keys to navigate between events, or click these arrows to move between slides.",
      title: "Navigate Events",
    },
    {
      target: ".tl-timenav",
      content: isMobile()
        ? "Drag this timeline horizontally to browse through different time periods. Double tap an event to zoom in."
        : "Scroll horizontally to browse through different time periods. Click on any event to zoom in.",
      title: "Timeline Navigation",
    },
    {
      target: ".tl-menubar-button",
      content:
        "Use these buttons to zoom in/out and jump to the first or last event in your timeline.",
      title: "Timeline Controls",
    },
    {
      target: ".speed-dial-button",
      content:
        "Click here to access additional controls for editing pages and filtering events.",
      title: "Additional Controls",
      spotlightClicks: true,
    },
  ];

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Start tour when timeline is initialized
  useEffect(() => {
    if (!isTimelineInitialized || !isMounted) return;

    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem(
      "wikitimeline_timeline_tour_completed"
    );

    if (!hasSeenTour) {
      // Small delay to ensure DOM elements are fully rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isTimelineInitialized, isMounted]);

  // Handle tour completion
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    // If we're on the last step (speed dial button), trigger the click
    if (type === "step:after" && index === steps.length - 1) {
      onSpeedDialClick?.();
    }

    // Save to localStorage when tour is finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("wikitimeline_timeline_tour_completed", "true");
    }
  };

  // Only render on client side
  if (!isMounted) return null;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      scrollToFirstStep={true}
      spotlightClicks={false}
      disableOverlayClose={true}
      styles={{
        options: {
          primaryColor: "#3b82f6",
          backgroundColor: "#ffffff",
          arrowColor: "#ffffff",
          textColor: "#333333",
          zIndex: 10000,
        },
        spotlight: {
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "#3b82f6",
        },
        buttonBack: {
          color: "#3b82f6",
        },
      }}
      locale={{
        last: "Finish",
        skip: "Skip tour",
      }}
      callback={handleJoyrideCallback}
    />
  );
}
