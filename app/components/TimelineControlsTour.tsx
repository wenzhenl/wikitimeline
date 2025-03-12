"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps, Step } from "react-joyride";
import { STATUS } from "react-joyride";

// Dynamically import Joyride with no SSR
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface TimelineControlsTourProps {
  isTimelineInitialized: boolean;
  onSpeedDialClick?: () => void;
  onFilterClick?: () => void;
  onEditPagesClick?: () => void;
}

export default function TimelineControlsTour({
  isTimelineInitialized,
  onSpeedDialClick,
  onFilterClick,
  onEditPagesClick,
}: TimelineControlsTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Define tour steps
  const steps: Step[] = [
    {
      target: ".speed-dial-button",
      content:
        "Let's explore the additional controls available for your timeline.",
      placement: "left",
      disableBeacon: true,
      title: "Timeline Controls",
      spotlightClicks: true,
    },
    {
      target: '[data-tour="edit-pages-button"]',
      content: "Here you can add or remove Wikipedia pages from your timeline.",
      title: "Edit Pages",
      spotlightClicks: true,
    },
    {
      target: '[data-tour="filter-button"]',
      content:
        "Filter events by date range or show only the most important events to focus on specific periods or highlights.",
      title: "Filter Events",
      spotlightClicks: true,
    },
  ];

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Start tour when timeline is initialized and first tour is completed
  useEffect(() => {
    if (!isTimelineInitialized || !isMounted) return;

    // Check if user has seen the first tour
    const hasSeenFirstTour = localStorage.getItem(
      "wikitimeline_timeline_tour_completed"
    );
    // Check if user has seen this tour
    const hasSeenControlsTour = localStorage.getItem(
      "wikitimeline_controls_tour_completed"
    );

    if (hasSeenFirstTour && !hasSeenControlsTour) {
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

    // Handle clicks on specific steps
    if (type === "step:after") {
      switch (index) {
        case 0:
          onSpeedDialClick?.();
          break;
        case 1:
          onEditPagesClick?.();
          break;
        case 2:
          onFilterClick?.();
          break;
      }
    }

    // Save to localStorage when tour is finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("wikitimeline_controls_tour_completed", "true");
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
