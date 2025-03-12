"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps, Step } from "react-joyride";
import { STATUS } from "react-joyride";

// Dynamically import Joyride with no SSR
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface OnboardingTourProps {
  isSearchReady: boolean;
}

export default function OnboardingTour({ isSearchReady }: OnboardingTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Define tour steps
  const steps: Step[] = [
    {
      target: ".wiki-search-container",
      content:
        "Welcome to WikiTimeline! Let's take a quick tour to help you get started.",
      placement: "center",
      disableBeacon: true,
      title: "Welcome to WikiTimeline",
    },
    {
      target: ".wiki-search-input",
      content:
        "Search for Wikipedia articles by title or paste Wikipedia URLs directly here. You can add multiple articles to create a comprehensive timeline.",
      disableBeacon: true,
      title: "Search or Paste URLs",
    },
    {
      target: ".wiki-language-selector",
      content:
        "Select different languages to search in various Wikipedia editions. You can mix articles from different languages in your timeline!",
      title: "Multiple Languages",
    },
    {
      target: ".wiki-selected-pages",
      content:
        "Your selected articles will appear here. You can add multiple articles to compare events across different topics.",
      title: "Selected Articles",
    },
    {
      target: ".wiki-generate-button",
      content:
        "Once you've selected your articles, click here to generate your timeline!",
      title: "Generate Timeline",
    },
  ];

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if this is the user's first visit
  useEffect(() => {
    // Wait for search component to be ready and component to be mounted
    if (!isSearchReady || !isMounted) return;

    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem("wikitimeline_tour_completed");

    // Only show tour for first-time visitors
    if (!hasSeenTour) {
      // Small delay to ensure DOM elements are fully rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isSearchReady, isMounted]);

  // Handle tour completion
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    // Save to localStorage when tour is finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("wikitimeline_tour_completed", "true");
    }

    // For debugging
    if (process.env.NODE_ENV === "development") {
      console.log("Joyride callback:", type, status);
    }
  };

  // Only render Joyride on client side
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
          zIndex: 1000,
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
