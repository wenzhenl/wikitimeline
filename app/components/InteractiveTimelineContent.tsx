"use client";

import { useEffect, useState, useRef } from "react";
import MyTimelineComponent from "@/app/components/MyTimelineComponent";
import Link from "next/link";
import { formatTimelineEventsForInteractive } from "@/app/utils/formatTimelineEvents";
import { SITE_CONFIG } from "@/app/config/site";
import { AVAILABLE_FONTS } from "@/app/constants/fonts";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";
import TimelineControls from "@/app/components/TimelineControls";
import TimelineCustomizer from "@/app/components/TimelineCustomizer";
import { useRouter } from "next/navigation";
import { TimelineAPIResponse, TimelineJSTimeline } from "@/app/types/timeline";
import ShareButtons from "@/app/components/ShareButtons";
import LoadingUI from "@/app/components/LoadingUI";
import { PAGE_DELIMITER } from "@/app/constants";
import logger from "@/app/utils/logger";

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
                "default"
              )
            ),
          0
        );
      });
      setTimelineJSTimeline(formatted);
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
  }, [initialData]);

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
        <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[10001]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="flex justify-between items-center h-16"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "4rem",
              }}
            >
              <div className="flex-shrink-0">
                <Link
                  href="/"
                  className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 py-4"
                >
                  WikiTimeline
                </Link>
              </div>
            </div>
          </div>
        </nav>
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
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[10001]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="flex justify-between items-center h-16"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: "4rem",
            }}
          >
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 py-4"
              >
                WikiTimeline
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex justify-between items-center w-full max-w-2xl ml-12 px-4">
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
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const pageNames = decodeURIComponent(
                      params.pageName
                    ).replace(/_/g, " ");
                    const timelineUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;
                    const subject = encodeURIComponent(
                      `Timeline Issue: ${pageNames}`
                    );
                    const body = encodeURIComponent(
                      `I found an issue with the timeline for: ${pageNames}\n\n` +
                        `Timeline URL: ${timelineUrl}\n\n` +
                        `Issue description:\n`
                    );
                    window.location.href = `mailto:${SITE_CONFIG.CONTACT_EMAIL}?subject=${subject}&body=${body}`;
                  }}
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Report Issue
                </button>
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
                  <button
                    onClick={() => {
                      const pageNames = decodeURIComponent(
                        params.pageName
                      ).replace(/_/g, " ");
                      const timelineUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;
                      const subject = encodeURIComponent(
                        `Timeline Issue: ${pageNames}`
                      );
                      const body = encodeURIComponent(
                        `I found an issue with the timeline for: ${pageNames}\n\n` +
                          `Timeline URL: ${timelineUrl}\n\n` +
                          `Issue description:\n`
                      );
                      window.location.href = `mailto:${SITE_CONFIG.CONTACT_EMAIL}?subject=${subject}&body=${body}`;
                      setIsOptionsOpen(false);
                    }}
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Report Issue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

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
                  events={timelineJSTimeline.events}
                  scale={timelineJSTimeline.scale}
                  font={selectedFont}
                />
              </div>
              <div className="hidden lg:block relative w-full aspect-[16/9]">
                <MyTimelineComponent
                  title={timelineJSTimeline.title}
                  events={timelineJSTimeline.events}
                  scale={timelineJSTimeline.scale}
                  font={selectedFont}
                />
              </div>
              <TimelineControls
                selectedPages={selectedPages}
                onPagesChange={setSelectedPages}
                onRefresh={handleTimelineRefresh}
                isExpanded={isExpanded}
                onExpandedChange={setIsExpanded}
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
      {skippedPages.length > 0 && showSkippedModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-yellow-600 dark:text-yellow-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                      id="modal-title"
                    >
                      Some pages were skipped
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No timeline data could be extracted from:{" "}
                        {skippedPages
                          .map((page) => decodeURIComponent(page))
                          .join(PAGE_DELIMITER)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleSkippedModalClose}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
