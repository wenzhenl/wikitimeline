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
import LoadingUI from "@/app/components/LoadingUI";
import { PAGE_DELIMITER } from "@/app/constants";
import logger from "@/app/utils/logger";
import NavigationHeader from "@/app/components/NavigationHeader";

interface SelectedPage {
  title: string;
  link: string;
}

type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];
type FontId = (typeof AVAILABLE_FONTS)[number]["value"];

interface InteractiveTimelineContentProps {
  params: { pageName: string };
  initialData: TimelineAPIResponse;
}

export default function InteractiveTimelineContent({
  params,
  initialData,
}: InteractiveTimelineContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineJSTimeline, setTimelineJSTimeline] =
    useState<TimelineJSTimeline | null>(null);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [selectedFont, setSelectedFont] = useState<FontId>(
    AVAILABLE_FONTS[0].value
  );
  const [selectedColorScheme, setSelectedColorScheme] =
    useState<ColorSchemeId>("default");
  const [skippedPages, setSkippedPages] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const [showSkippedModal, setShowSkippedModal] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [hasSeenSwipeTip, setHasSeenSwipeTip] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<{
    startEventId: string | null;
    endEventId: string | null;
  }>({
    startEventId: null,
    endEventId: null,
  });
  const [filteredEvents, setFilteredEvents] = useState<TimelineJSEvent[]>([]);

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
    const savedFont = localStorage.getItem("timeline-font");
    if (savedFont) {
      setSelectedFont(savedFont as FontId);
    }
  }, []);

  useEffect(() => {
    const savedColorScheme = localStorage.getItem("timeline-color-scheme");
    if (
      savedColorScheme &&
      COLOR_SCHEMES.some((scheme) => scheme.id === savedColorScheme)
    ) {
      setSelectedColorScheme(savedColorScheme as ColorSchemeId);
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

  // Initialize timeline and loading state with MutationObserver
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
      setTimelineJSTimeline(formatted);

      // Initialize filtered events with all events
      if (formatted && formatted.events) {
        setFilteredEvents(formatted.events);
      }
    };
    formatEventsAsync();

    const observer = new MutationObserver(() => {
      if (
        timelineContainerRef.current?.querySelector(
          ".tl-timeline .tl-slider-container"
        )
      ) {
        setLoading(false);
        observer.disconnect();
      }
    });
    if (timelineContainerRef.current) {
      observer.observe(timelineContainerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    const timeout = setTimeout(() => {
      setLoading(false); // Fallback after 1s
      observer.disconnect();
    }, 1000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [initialData, selectedColorScheme]);

  // Update timeline when color scheme changes
  useEffect(() => {
    if (timelineJSTimeline) {
      setTimelineJSTimeline(
        formatTimelineEventsForInteractive(
          initialData.timelines,
          selectedColorScheme
        )
      );
    }
  }, [selectedColorScheme, initialData]);

  // Add a new useEffect to handle filtering events when date range changes
  useEffect(() => {
    if (!timelineJSTimeline || !timelineJSTimeline.events) return;

    logger.debug("Filter change detected", {
      startEventId: dateRangeFilter.startEventId,
      endEventId: dateRangeFilter.endEventId,
      currentScale: timelineJSTimeline.scale || "human",
    });

    if (!dateRangeFilter.startEventId && !dateRangeFilter.endEventId) {
      // No filters applied, show all events
      setFilteredEvents(timelineJSTimeline.events);
      logger.debug(
        "No filter applied, using all events with scale:",
        timelineJSTimeline.scale || "human"
      );
      return;
    }

    const allEvents = [...timelineJSTimeline.events];
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

    // Extract the events within the range
    const filtered = sortedEvents.slice(startIndex, endIndex + 1);
    logger.debug(
      "Filtered events count:",
      filtered.length,
      "of",
      timelineJSTimeline.events.length
    );

    // If filtering has changed the events, we may need to update the timeline with a new scale
    // (e.g., if we filtered out all cosmological dates)
    if (filtered.length !== timelineJSTimeline.events.length) {
      // Create a modified version of the timeline with just the filtered events
      // This allows the formatTimelineEventsForInteractive function to recalculate scale based on filtered events
      const modifiedTimeline = {
        ...timelineJSTimeline,
        events: filtered,
      };

      // Instead of just setting filtered events, we need to check if we need to reapply formatting
      // to ensure proper scale (cosmological vs human)
      const needsCosmologicalScale = filtered.some((event) => {
        const { year } = event.start_date || { year: 0 };
        const absYear = Math.abs(year);
        return year < 0 ? absYear > 271821 : absYear > 275760;
      });

      logger.debug("Scale analysis:", {
        currentScale: timelineJSTimeline.scale || "human",
        needsCosmologicalScale,
        filteredEventsRequireCosmological: needsCosmologicalScale,
        oldestYearInFiltered: Math.min(
          ...filtered.map((e) => e.start_date?.year || 0)
        ),
        newestYearInFiltered: Math.max(
          ...filtered.map((e) => e.start_date?.year || 0)
        ),
      });

      // If scale needs to change, reformat the timeline
      if (
        (timelineJSTimeline.scale === "cosmological" &&
          !needsCosmologicalScale) ||
        (!timelineJSTimeline.scale && needsCosmologicalScale)
      ) {
        // Create a temporary version of the original data with only filtered events
        const tempTimelines = { ...initialData.timelines };
        const reformatted = formatTimelineEventsForInteractive(
          tempTimelines,
          selectedColorScheme
        );

        logger.debug("Scale change required!", {
          oldScale: timelineJSTimeline.scale || "human",
          newScale: reformatted.scale || "human",
          reason: timelineJSTimeline.scale
            ? "Switched to human scale"
            : "Switched to cosmological scale",
        });

        // Update only the filtered events, preserving other timeline properties
        setFilteredEvents(filtered);
        if (reformatted.scale !== timelineJSTimeline.scale) {
          // If scale changed, update the entire timeline object
          setTimelineJSTimeline({
            ...timelineJSTimeline,
            scale: reformatted.scale,
            events: filtered,
          });
        }
      } else {
        // No scale change needed, just update filtered events
        logger.debug(
          "No scale change needed, keeping",
          timelineJSTimeline.scale || "human"
        );
        setFilteredEvents(filtered);
      }
    } else {
      // No filtering occurred, use all events
      logger.debug(
        "Using all events, keeping scale",
        timelineJSTimeline.scale || "human"
      );
      setFilteredEvents(filtered);
    }
  }, [
    timelineJSTimeline,
    dateRangeFilter,
    initialData.timelines,
    selectedColorScheme,
  ]);

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
    const tipSeen = localStorage.getItem("timeline-swipe-tip-seen");
    if (tipSeen) {
      setHasSeenSwipeTip(true);
    } else {
      const handleNavigation = () => {
        localStorage.setItem("timeline-swipe-tip-seen", "true");
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
          <div
            className="flex-1 w-full max-w-3xl lg:max-w-4xl xl:max-w-[min(90vw,calc((100vh-200px)*16/9))] 2xl:max-w-[min(90vw,calc((100vh-200px)*16/9))]"
            style={{ minHeight: "500px" }}
          >
            <LoadingUI />
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
        <div className="md:hidden">
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
              ref={timelineContainerRef} // Attach ref here
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="h-[500px] lg:hidden">
                <MyTimelineComponent
                  title={timelineJSTimeline.title}
                  events={filteredEvents}
                  scale={timelineJSTimeline.scale}
                  font={selectedFont}
                />
              </div>
              <div className="hidden lg:block relative w-full aspect-[16/9]">
                <MyTimelineComponent
                  title={timelineJSTimeline.title}
                  events={filteredEvents}
                  scale={timelineJSTimeline.scale}
                  font={selectedFont}
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
              />
            </div>
          )}
        </div>
      </main>

      {/* Use the new TimelineCustomizer for mobile (this is just for the modal) */}
      {isSettingsOpen && (
        <TimelineCustomizer
          selectedFont={selectedFont}
          setSelectedFont={setSelectedFont}
          selectedColorScheme={selectedColorScheme}
          setSelectedColorScheme={setSelectedColorScheme}
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
