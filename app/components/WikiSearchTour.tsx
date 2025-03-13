"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { CallBackProps, Step } from "react-joyride";
import { STATUS } from "react-joyride";

// Dynamically import Joyride with no SSR
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface WikiSearchTourProps {
  isSearchReady: boolean;
}

// Function to detect if the user agent is a bot/crawler
const isBot = () => {
  if (typeof window === "undefined") return true; // SSR check

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

export default function WikiSearchTour({ isSearchReady }: WikiSearchTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isRealUser, setIsRealUser] = useState(false);

  // Define tour steps
  const steps: Step[] = [
    {
      target: ".wiki-search-container",
      content: "Let's take a quick tour to help you get started.",
      placement: "center",
      disableBeacon: true,
      title: "Welcome to WikiTimeline",
      disableScrolling: true,
      spotlightClicks: false,
    },
    {
      target: ".wiki-search-input",
      content:
        "Search for Wikipedia articles by title or paste Wikipedia URLs directly here. You can add multiple articles to create a comprehensive timeline.",
      disableBeacon: true,
      title: "Search or Paste URLs",
      disableScrolling: true,
      spotlightClicks: false,
      placement: "bottom",
    },
    {
      target: ".wiki-language-selector",
      content:
        "Select different languages to search in various Wikipedia editions. You can mix articles from different languages in your timeline!",
      title: "Multiple Languages",
      disableScrolling: true,
      spotlightClicks: false,
      placement: "bottom-end",
    },
  ];

  // Set mounted state and check if real user
  useEffect(() => {
    setIsMounted(true);
    setIsRealUser(!isBot());
  }, []);

  // Check if this is the user's first visit
  useEffect(() => {
    // Only proceed if it's a real user, component is mounted, and search is ready
    if (!isRealUser || !isSearchReady || !isMounted) return;

    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem(
      "wikitimeline_wiki_search_tour_completed",
    );

    // Only show tour for first-time visitors
    if (!hasSeenTour) {
      // Longer delay to ensure DOM elements are fully rendered and stable
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSearchReady, isMounted, isRealUser]);

  // Handle tour completion
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    // Save to localStorage when tour is finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("wikitimeline_wiki_search_tour_completed", "true");
    }

    // For debugging
    if (process.env.NODE_ENV === "development") {
      console.log("Joyride callback:", type, status);
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
