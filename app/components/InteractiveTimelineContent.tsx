"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import MyTimelineComponent from "@/app/components/MyTimelineComponent";
import Link from "next/link";
import { formatTimelineEventsForInteractive } from "@/app/utils/formatTimelineEvents";
import { SITE_CONFIG } from "@/app/config/site";
import { AVAILABLE_FONTS } from "@/app/constants/fonts";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";
import TimelineControls from "@/app/components/TimelineControls";
import TimelineCustomizer from "@/app/components/TimelineCustomizer";
import ReportIssueButton from "@/app/components/ReportIssueButton";
import SkippedPagesModal from "@/app/components/SkippedPagesModal";
import { useRouter } from "next/navigation";
import {
  TimelineAPIResponse,
  TimelineJSTimeline,
  TimelineJSEvent,
} from "@/app/types/timeline";
import ShareButtons from "@/app/components/ShareButtons";
import { PAGE_DELIMITER } from "@/app/constants";
import logger from "@/app/utils/logger";
import NavigationHeader from "@/app/components/NavigationHeader";

interface SelectedPage {
  title: string;
  link: string;
}

type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];
type FontId = (typeof AVAILABLE_FONTS)[number]["value"];
type TimenavPosition = "top" | "bottom";

interface InteractiveTimelineContentProps {
  params: { pageName: string };
  initialData: TimelineAPIResponse;
}

export default function InteractiveTimelineContent({
  params,
  initialData,
}: InteractiveTimelineContentProps) {
  const router = useRouter();

  // Safe localStorage helper functions
  const safeGetItem = (key: string, defaultValue: string = ""): string => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key) || defaultValue;
    }
    return defaultValue;
  };

  const safeSetItem = (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  };

  const [loading, setLoading] = useState(true);
  const [timelineJSTimeline, setTimelineJSTimeline] =
    useState<TimelineJSTimeline | null>(null);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [selectedFont, setSelectedFont] = useState<FontId>(
    AVAILABLE_FONTS[0].value
  );
  const [selectedColorScheme, setSelectedColorScheme] =
    useState<ColorSchemeId>("default");
  const [selectedTimenavPosition, setSelectedTimenavPosition] =
    useState<TimenavPosition>("bottom");
  const [timenavHeightPercentage, setTimenavHeightPercentage] =
    useState<number>(() => {
      const savedPercentage = safeGetItem("timeline-timenav-height");
      return savedPercentage ? parseInt(savedPercentage, 10) : 50;
    });
  const [skippedPages, setSkippedPages] = useState<string[]>([]);
  const [showSkippedModal, setShowSkippedModal] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [hasSeenSwipeTip, setHasSeenSwipeTip] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [activeControlsModal, setActiveControlsModal] = useState<
    "pages" | "filter" | null
  >(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<{
    startEventId: string | null;
    endEventId: string | null;
  }>({
    startEventId: null,
    endEventId: null,
  });
  const [filteredEvents, setFilteredEvents] = useState<TimelineJSEvent[]>([]);
  const [topEventsCount, setTopEventsCount] = useState<number | null>(null);
  const [originalTimelineJSTimeline, setOriginalTimelineJSTimeline] =
    useState<TimelineJSTimeline | null>(null);
  const [isTimelineInitialized, setIsTimelineInitialized] = useState(false);

  // Initialize selected pages from URL
  useEffect(() => {
    const pageNames = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .map((name) => name.trim())
      .filter(Boolean);

    setSelectedPages(
      pageNames.map((name) => ({
        title: name.replace(/_/g, " "),
        link: `https://en.wikipedia.org/wiki/${name.replace(/ /g, "_")}`,
      }))
    );
  }, [params.pageName]);

  useEffect(() => {
    const savedFont = safeGetItem("timeline-font");
    if (savedFont) {
      setSelectedFont(savedFont as FontId);
    }
  }, []);

  useEffect(() => {
    const savedColorScheme = safeGetItem("timeline-color-scheme");
    if (
      savedColorScheme &&
      COLOR_SCHEMES.some((scheme) => scheme.id === savedColorScheme)
    ) {
      setSelectedColorScheme(savedColorScheme as ColorSchemeId);
    }
  }, []);

  useEffect(() => {
    const savedTimenavPosition = safeGetItem("timeline-timenav-position");
    if (savedTimenavPosition === "top" || savedTimenavPosition === "bottom") {
      setSelectedTimenavPosition(savedTimenavPosition as TimenavPosition);
    }
  }, []);

  const handleCopyEmbedCode = async () => {
    const embedCode = `<iframe
      src="${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/embed"
      width="100%"
      height="600"
      frameborder="0"
      allow="fullscreen"
      style="border: 1px solid #e5e7eb; border-radius: 8px;"
    ></iframe>`;

    try {
      await navigator.clipboard.writeText(embedCode);
      alert("Embed code copied to clipboard!");
    } catch (err) {
      logger.error("Failed to copy:", err);
      alert("Failed to copy embed code. Please try again.");
    }
  };

  useEffect(() => {
    if (initialData.errors?.failedPages) {
      setSkippedPages(initialData.errors.failedPages);
    }
  }, [initialData]);

  useEffect(() => {
    const formatEventsAsync = async () => {
      const formatted = await new Promise<TimelineJSTimeline>((resolve) => {
        setTimeout(
          () =>
            resolve(
              formatTimelineEventsForInteractive(
                initialData.timelines,
                selectedColorScheme
              )
            ),
          0
        );
      });

      // Store both the original timeline and the current timeline
      setOriginalTimelineJSTimeline(formatted);
      setTimelineJSTimeline(formatted);

      // Initialize filtered events with all events
      if (formatted && formatted.events) {
        setFilteredEvents(formatted.events);
      }

      // Mark timeline data as ready
      setLoading(false);
    };
    formatEventsAsync();
  }, [initialData, selectedColorScheme]);

  // Add a listener for when the timeline is fully initialized
  const handleTimelineInitialized = useCallback(() => {
    setIsTimelineInitialized(true);
  }, []);

  // Update timeline when color scheme changes
  useEffect(() => {
    if (initialData.timelines) {
      const formatted = formatTimelineEventsForInteractive(
        initialData.timelines,
        selectedColorScheme
      );

      // Update both the original and current timeline
      setOriginalTimelineJSTimeline(formatted);
      setTimelineJSTimeline(formatted);

      // Reset filters when color scheme changes
      setFilteredEvents(formatted.events);
    }
  }, [selectedColorScheme, initialData]);

  // Simplified filtering - directly filter events from the original timeline
  useEffect(() => {
    if (!originalTimelineJSTimeline || !originalTimelineJSTimeline.events)
      return;

    logger.debug("Filter change detected", {
      startEventId: dateRangeFilter.startEventId,
      endEventId: dateRangeFilter.endEventId,
      topEventsCount: topEventsCount,
    });

    // Start with the original events
    let allEvents = [...originalTimelineJSTimeline.events];

    // Sort chronologically if not already sorted
    const sortedEvents = allEvents.sort((a, b) => {
      const aYear = a.start_date?.year || 0;
      const bYear = b.start_date?.year || 0;

      if (aYear !== bYear) return aYear - bYear;

      const aMonth = a.start_date?.month || 0;
      const bMonth = b.start_date?.month || 0;
      if (aMonth !== bMonth) return aMonth - bMonth;

      const aDay = a.start_date?.day || 0;
      const bDay = b.start_date?.day || 0;
      return aDay - bDay;
    });

    // Apply date range filtering
    let filteredByDateRange = sortedEvents;

    if (dateRangeFilter.startEventId || dateRangeFilter.endEventId) {
      let startIndex = 0;
      let endIndex = sortedEvents.length - 1;

      if (dateRangeFilter.startEventId) {
        const foundStartIndex = sortedEvents.findIndex(
          (event) => event.unique_id === dateRangeFilter.startEventId
        );
        if (foundStartIndex !== -1) {
          startIndex = foundStartIndex;
        }
      }

      if (dateRangeFilter.endEventId) {
        const foundEndIndex = sortedEvents.findIndex(
          (event) => event.unique_id === dateRangeFilter.endEventId
        );
        if (foundEndIndex !== -1) {
          endIndex = foundEndIndex;
        }
      }

      logger.debug("Applying date range filter", { startIndex, endIndex });
      filteredByDateRange = sortedEvents.slice(startIndex, endIndex + 1);
    }

    // Apply importance score filtering
    let finalFilteredEvents = filteredByDateRange;

    if (
      topEventsCount &&
      topEventsCount > 0 &&
      topEventsCount < filteredByDateRange.length
    ) {
      // Create a copy sorted by score (descending)
      const scoreSortedEvents = [...filteredByDateRange].sort((a, b) => {
        // Get the score from each timeline event
        // Access the score property using a type assertion
        const scoreA = (a as any).score;
        const scoreB = (b as any).score;

        // Sort by score (descending)
        const scoreDiff = scoreB - scoreA;

        logger.debug("Score difference", { scoreA, scoreB, scoreDiff });

        // If scores are equal, maintain chronological order
        if (scoreDiff === 0) {
          return sortedEvents.indexOf(a) - sortedEvents.indexOf(b);
        }

        return scoreDiff;
      });

      // Take only the top N events
      const topEvents = scoreSortedEvents.slice(0, topEventsCount);

      // Sort back to chronological order
      topEvents.sort(
        (a, b) => sortedEvents.indexOf(a) - sortedEvents.indexOf(b)
      );

      finalFilteredEvents = topEvents;

      logger.debug(
        `Applied importance filter: ${finalFilteredEvents.length} events after filtering by top ${topEventsCount}`
      );
    }

    // Check if the scale has changed due to filtering
    const needsCosmologicalScale = finalFilteredEvents.some((event) =>
      requiresCosmologicalScale(event.start_date)
    );

    // Update the timeline scale if needed
    if (
      (needsCosmologicalScale &&
        timelineJSTimeline?.scale !== "cosmological") ||
      (!needsCosmologicalScale && timelineJSTimeline?.scale === "cosmological")
    ) {
      logger.debug("Scale change detected due to filtering", {
        oldScale: timelineJSTimeline?.scale || "human",
        newScale: needsCosmologicalScale ? "cosmological" : "human",
      });

      setTimelineJSTimeline({
        ...originalTimelineJSTimeline,
        scale: needsCosmologicalScale ? "cosmological" : undefined,
        events: originalTimelineJSTimeline.events, // Keep all events, just update the scale
      });
    }

    // Update filtered events for display
    setFilteredEvents(finalFilteredEvents);
  }, [originalTimelineJSTimeline, dateRangeFilter, topEventsCount]);

  // Helper function to check if a date requires cosmological scale
  function requiresCosmologicalScale(date: any): boolean {
    if (!date || !date.year) return false;

    const absYear = Math.abs(date.year);
    return date.year < 0 ? absYear > 271821 : absYear > 275760;
  }

  const handleTimelineRefresh = () => {
    const pageNames = selectedPages
      .map((page) => {
        const titleFromUrl = page.link.split("/wiki/").pop();
        if (titleFromUrl) {
          const cleanTitle = decodeURIComponent(
            titleFromUrl.split("#")[0].split("?")[0]
          );
          return encodeURIComponent(cleanTitle);
        }
        return null;
      })
      .filter(Boolean);

    if (pageNames.length > 0) {
      const newPath = `/timeline/${pageNames.join(
        encodeURIComponent(PAGE_DELIMITER)
      )}`;
      if (newPath !== `/timeline/${params.pageName}`) {
        setLoading(true);
        router.push(newPath, { scroll: false });
      }
    }
  };

  const handleSkippedModalClose = () => {
    setShowSkippedModal(false);
    const validPages = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .filter((page) => !skippedPages.includes(page))
      .map((page) => encodeURIComponent(page))
      .join(encodeURIComponent(PAGE_DELIMITER));

    if (validPages) {
      router.replace(`/timeline/${validPages}`, { scroll: false });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const optionsButton = document.querySelector('[aria-label="Menu"]');
      const optionsMenu = document.querySelector(".options-menu");

      if (
        isOptionsOpen &&
        !optionsButton?.contains(target) &&
        !optionsMenu?.contains(target)
      ) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOptionsOpen]);

  useEffect(() => {
    const tipSeen = safeGetItem("timeline-swipe-tip-seen");
    if (tipSeen) {
      setHasSeenSwipeTip(true);
    } else {
      const handleNavigation = () => {
        safeSetItem("timeline-swipe-tip-seen", "true");
        setHasSeenSwipeTip(true);
      };
      document.addEventListener("keydown", handleNavigation);
      document.addEventListener("touchend", handleNavigation);
      return () => {
        document.removeEventListener("keydown", handleNavigation);
        document.removeEventListener("touchend", handleNavigation);
      };
    }
  }, []);

  // Handle date range change
  const handleDateRangeChange = (
    startEventId: string | null,
    endEventId: string | null
  ) => {
    setDateRangeFilter({ startEventId, endEventId });
  };

  // Handle top events count filter changes
  const handleTopEventsCountChange = (count: number | null) => {
    setTopEventsCount(count);
  };

  // If still loading the timeline data, show loading state with header
  if (loading || !timelineJSTimeline) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <NavigationHeader zIndex="z-[10001]" />
        <main
          className="flex-1 flex justify-center px-4 py-6"
          style={{
            flex: "1 0 auto",
            display: "flex",
            justifyContent: "center",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "1.5rem",
            paddingBottom: "1.5rem",
          }}
        >
          <div className="flex-1 w-full max-w-3xl lg:max-w-4xl xl:max-w-[min(90vw,calc((100vh-200px)*16/9))] 2xl:max-w-[min(90vw,calc((100vh-200px)*16/9))]">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              {/* Timeline placeholder */}
              <div className="h-[500px] lg:hidden">
                <div className="h-full flex flex-col">
                  {/* Timeline navigation placeholder */}
                  <div className="h-1/2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
                    <div className="h-full flex items-center justify-center">
                      <div className="w-3/4 h-2 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                  {/* Timeline content placeholder */}
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg"></div>
                </div>
              </div>
              {/* Desktop placeholder */}
              <div className="hidden lg:block relative w-full aspect-[16/9]">
                <div className="absolute inset-0 flex flex-col">
                  {/* Timeline navigation placeholder */}
                  <div className="h-1/2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
                    <div className="h-full flex items-center justify-center">
                      <div className="w-3/4 h-2 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                  {/* Timeline content placeholder */}
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <NavigationHeader zIndex="z-[10001]">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center w-full">
          <div className="flex justify-center">
            <TimelineCustomizer
              selectedFont={selectedFont}
              setSelectedFont={setSelectedFont}
              selectedColorScheme={selectedColorScheme}
              setSelectedColorScheme={setSelectedColorScheme}
              selectedTimenavPosition={selectedTimenavPosition}
              setSelectedTimenavPosition={setSelectedTimenavPosition}
              timenavHeightPercentage={timenavHeightPercentage}
              setTimenavHeightPercentage={setTimenavHeightPercentage}
              isSettingsOpen={isSettingsOpen}
              setIsSettingsOpen={setIsSettingsOpen}
            />
          </div>

          <div className="flex justify-center">
            <Link
              href={`/timeline/${params.pageName}/text`}
              className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg whitespace-nowrap"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Reader View
            </Link>
          </div>

          <div className="flex justify-center">
            <ShareButtons
              url={`${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`}
              title={`Timeline of ${decodeURIComponent(params.pageName).replace(
                /_/g,
                " "
              )}`}
              description={`🚀 Explore the history of ${decodeURIComponent(
                params.pageName
              )
                .replace(/_/g, " ")
                .replace(
                  /,/g,
                  ", "
                )} through this interactive timeline! 📚 Powered by wiki-timeline.com`}
              customAction={{
                label: "Copy Embed Code",
                onClick: handleCopyEmbedCode,
              }}
            />
          </div>

          <div className="flex justify-center">
            <ReportIssueButton pageName={params.pageName} />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex justify-end w-full">
          <button
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label="Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {isOptionsOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 options-menu">
              <TimelineCustomizer
                selectedFont={selectedFont}
                setSelectedFont={setSelectedFont}
                selectedColorScheme={selectedColorScheme}
                setSelectedColorScheme={setSelectedColorScheme}
                selectedTimenavPosition={selectedTimenavPosition}
                setSelectedTimenavPosition={setSelectedTimenavPosition}
                timenavHeightPercentage={timenavHeightPercentage}
                setTimenavHeightPercentage={setTimenavHeightPercentage}
                isSettingsOpen={isSettingsOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                isMobileButton={true}
                onMobileClick={() => {
                  setIsSettingsOpen(true);
                  setIsOptionsOpen(false);
                }}
              />
              <Link
                href={`/timeline/${params.pageName}/text`}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Reader View
              </Link>
              <ShareButtons
                url={`${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`}
                title={`Timeline of ${decodeURIComponent(
                  params.pageName
                ).replace(/_/g, " ")}`}
                description={`🚀 Explore the history of ${decodeURIComponent(
                  params.pageName
                )
                  .replace(/_/g, " ")
                  .replace(
                    /,/g,
                    ", "
                  )} through this interactive timeline! 📚 Powered by wiki-timeline.com`}
                customAction={{
                  label: "Copy Embed Code",
                  onClick: handleCopyEmbedCode,
                }}
              />
              <ReportIssueButton
                pageName={params.pageName}
                isMobile={true}
                onMobileClick={() => setIsOptionsOpen(false)}
              />
            </div>
          )}
        </div>
      </NavigationHeader>

      <main
        className="flex-1 flex justify-center px-4 py-6"
        style={{
          flex: "1 0 auto",
          display: "flex",
          justifyContent: "center",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
        }}
      >
        <div className="flex-1 w-full max-w-3xl lg:max-w-4xl xl:max-w-[min(90vw,calc((100vh-200px)*16/9))] 2xl:max-w-[min(90vw,calc((100vh-200px)*16/9))]">
          {timelineJSTimeline.events.length > 0 && (
            <div
              ref={timelineContainerRef}
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="h-[500px] lg:hidden">
                <MyTimelineComponent
                  title={timelineJSTimeline.title}
                  events={filteredEvents}
                  scale={timelineJSTimeline.scale}
                  font={selectedFont}
                  timenavPosition={selectedTimenavPosition}
                  timenavMobileHeightPercentage={timenavHeightPercentage}
                  onInitialized={handleTimelineInitialized}
                />
              </div>
              <div className="hidden lg:block relative w-full aspect-[16/9]">
                <MyTimelineComponent
                  title={timelineJSTimeline.title}
                  events={filteredEvents}
                  scale={timelineJSTimeline.scale}
                  font={selectedFont}
                  timenavPosition={selectedTimenavPosition}
                  timenavHeightPercentage={timenavHeightPercentage}
                  onInitialized={handleTimelineInitialized}
                />
              </div>
              <TimelineControls
                selectedPages={selectedPages}
                onPagesChange={setSelectedPages}
                onRefresh={handleTimelineRefresh}
                isExpanded={isControlsExpanded}
                onExpandedChange={setIsControlsExpanded}
                events={timelineJSTimeline.events}
                onDateRangeChange={handleDateRangeChange}
                activeModal={activeControlsModal}
                setActiveModal={setActiveControlsModal}
                currentDateRange={dateRangeFilter}
                onTopEventsCountChange={handleTopEventsCountChange}
                currentTopEventsCount={topEventsCount}
              />
            </div>
          )}
        </div>
      </main>

      {/* Use the TimelineCustomizer for mobile (this is just for the modal) */}
      {isSettingsOpen && (
        <TimelineCustomizer
          selectedFont={selectedFont}
          setSelectedFont={setSelectedFont}
          selectedColorScheme={selectedColorScheme}
          setSelectedColorScheme={setSelectedColorScheme}
          selectedTimenavPosition={selectedTimenavPosition}
          setSelectedTimenavPosition={setSelectedTimenavPosition}
          timenavHeightPercentage={timenavHeightPercentage}
          setTimenavHeightPercentage={setTimenavHeightPercentage}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
        />
      )}

      {/* Skipped Pages Modal */}
      <SkippedPagesModal
        skippedPages={skippedPages}
        showModal={showSkippedModal}
        onClose={handleSkippedModalClose}
      />

      <style jsx global>{`
        .tl-slide-content
          .tl-text
          .tl-text-content-container
          .tl-text-headline-container
          .tl-headline-date,
        .tl-text .tl-headline-date {
          color: #4b5563 !important;
          text-shadow: none !important;
          font-weight: 500 !important;
          opacity: 0.9 !important;
        }
        ${hasSeenSwipeTip
          ? `
        .tl-loading-icon,
        .tl-message-full {
          display: none !important;
        }
        `
          : ""}
      `}</style>
    </div>
  );
}
