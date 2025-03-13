"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps, Step } from "react-joyride";
import { STATUS } from "react-joyride";

// Dynamically import Joyride with no SSR
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface InteractiveTimelineTourProps {
  isTimelineReady: boolean;
}

// Function to detect if device is mobile
const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
};

// Function to detect if the user agent is a bot/crawler
const isBot = () => {
  if (typeof window === "undefined") return true;
  const botPatterns = [
    "bot",
    "spider",
    "crawler",
    "googlebot",
    "bingbot",
    "slurp",
    "duckduckbot",
    "baiduspider",
    "yandexbot",
    "facebookexternalhit",
    "sogou",
    "ia_archiver",
    "alexa",
    "aol",
    "twitterbot",
  ];
  const userAgent = navigator.userAgent.toLowerCase();
  return botPatterns.some((pattern) => userAgent.includes(pattern));
};

export default function InteractiveTimelineTour({
  isTimelineReady,
}: InteractiveTimelineTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isRealUser, setIsRealUser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Update mobile state on mount and window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Define tour steps
  const steps: Step[] = [
    {
      target: "body",
      content: isMobile
        ? "Swipe left or right to browse through events."
        : "Use your mouse wheel or arrow keys to browse through events.",
      placement: "center",
      disableBeacon: true,
      title: "Welcome to your timeline!",
      disableScrolling: true,
      spotlightClicks: false,
    },
    {
      target: ".timeline-controls-tour",
      content:
        "Click this button to access timeline controls. You can edit pages in your timeline or filter events based on date range and importance.",
      placement: "left",
      title: "Timeline Controls",
      disableScrolling: true,
      spotlightClicks: false,
    },
    {
      target: ".timeline-customizer-tour",
      content:
        "Customize your timeline's appearance here. You can change fonts, colors, and adjust the navigation bar's position and size.",
      title: "Timeline Customization",
      disableScrolling: true,
      spotlightClicks: false,
      placement: "bottom",
    },
    {
      target: ".reader-view-button",
      content:
        "Click this button to view your timeline in a reader view. This is great for reading on a mobile device.",
      title: "Reader View",
      disableScrolling: true,
      spotlightClicks: false,
      placement: "bottom",
    },
  ];

  // Set mounted state and check if real user
  useEffect(() => {
    setIsMounted(true);
    setIsRealUser(!isBot());
  }, []);

  // Start tour when timeline is ready
  useEffect(() => {
    if (!isRealUser || !isTimelineReady || !isMounted) return;

    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem(
      "wikitimeline_interactive_tour_completed"
    );

    // Only show tour for first-time visitors
    if (!hasSeenTour) {
      // Add delay to ensure DOM elements are fully rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isTimelineReady, isMounted, isRealUser]);

  // Handle tour completion
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("wikitimeline_interactive_tour_completed", "true");
    }
  };

  // Don't render anything for bots or during SSR
  if (!isMounted || !isRealUser) return null;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      scrollToFirstStep={false}
      disableOverlayClose={true}
      disableScrolling={true}
      scrollOffset={0}
      spotlightClicks={false}
      styles={{
        options: {
          primaryColor: "#3b82f6",
          backgroundColor: "#ffffff",
          arrowColor: "#ffffff",
          textColor: "#333333",
          zIndex: 1000,
          overlayColor: "rgba(0, 0, 0, 0.5)",
        },
        spotlight: {
          backgroundColor: "transparent",
        },
        tooltipContainer: {
          textAlign: "left",
          maxWidth: "450px",
        },
        buttonNext: {
          backgroundColor: "#3b82f6",
        },
        buttonBack: {
          color: "#3b82f6",
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
      locale={{
        last: "Finish",
        skip: "Skip tour",
      }}
      callback={handleJoyrideCallback}
    />
  );
}
