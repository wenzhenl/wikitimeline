"use client";

import { useEffect, useState } from "react";
import MyTimelineComponent from "@/app/components/MyTimelineComponent";
import Link from "next/link";
import { formatTimelineEventsForInteractive } from "@/app/utils/formatTimelineEvents";
import { SITE_CONFIG } from "@/app/config/site";
import { AVAILABLE_FONTS } from "@/app/constants/fonts";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";
import TimelineControls from "@/app/components/TimelineControls";
import { useRouter } from "next/navigation";
import { TimelineAPIResponse, TimelineData } from "@/app/types/timeline";
import ShareButtons from "@/app/components/ShareButtons";
import LoadingUI from "@/app/components/LoadingUI";
import { PAGE_DELIMITER } from "@/app/constants";
import logger from "@/app/utils/logger";

interface SelectedPage {
  title: string;
  link: string;
}

// Add this type near the top with other interfaces
type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];

// Add this with other type definitions
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
  const formattedEvents = formatTimelineEventsForInteractive(
    initialData.timelines,
    "default"
  );
  // logger.debug("FORMATTED EVENTS:", JSON.stringify(formattedEvents, null, 2));
  const [events, setEvents] = useState<TimelineData>(formattedEvents);
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

  // Initialize selected pages from URL
  useEffect(() => {
    // Split by comma and handle encoded commas
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

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = e.target.value;
    setSelectedFont(newFont as FontId);
    localStorage.setItem("timeline-font", newFont);
  };

  useEffect(() => {
    const savedColorScheme = localStorage.getItem("timeline-color-scheme");
    if (
      savedColorScheme &&
      COLOR_SCHEMES.some((scheme) => scheme.id === savedColorScheme)
    ) {
      setSelectedColorScheme(savedColorScheme as ColorSchemeId);
    }
  }, []);

  const handleColorSchemeChange = (value: string) => {
    setSelectedColorScheme(value);
    localStorage.setItem("timeline-color-scheme", value);
  };

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

  // Initialize skipped pages from initial data
  useEffect(() => {
    if (initialData.errors?.failedPages) {
      setSkippedPages(initialData.errors.failedPages);
    }
  }, [initialData]);

  // Update events when color scheme changes
  useEffect(() => {
    setEvents(
      formatTimelineEventsForInteractive(
        initialData.timelines,
        selectedColorScheme
      )
    );
  }, [initialData, selectedColorScheme]);

  // Update the refresh handler
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

    // Filter out skipped pages and properly encode the URL
    const validPages = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .filter((page) => !skippedPages.includes(page))
      .map((page) => encodeURIComponent(page))
      .join(encodeURIComponent(PAGE_DELIMITER));

    // Update URL if there are any valid pages left
    if (validPages) {
      router.replace(`/timeline/${validPages}`, { scroll: false });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const optionsButton = document.querySelector(
        '[aria-label="More options"]'
      );
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
    // Shorter timeout for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Add a second effect to handle immediate load if timeline is ready
  useEffect(() => {
    if (document.querySelector(".tl-timeline .tl-slider-container")) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user has seen the swipe tip before
    const tipSeen = localStorage.getItem("timeline-swipe-tip-seen");
    if (tipSeen) {
      setHasSeenSwipeTip(true);
    } else {
      // Listen for swipe/navigation actions
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

  if (loading) {
    return <LoadingUI />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[10001]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
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
                <button
                  onClick={() => setIsSettingsOpen(true)}
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
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Customize Timeline
                </button>
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
                    window.location.href = `mailto:wikitimeline2024@gmail.com?subject=${subject}&body=${body}`;
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
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
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
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    Customize Timeline
                  </button>
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
                      window.location.href = `mailto:wikitimeline2024@gmail.com?subject=${subject}&body=${body}`;
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

      <main className="flex-1 flex justify-center px-4 py-6">
        <div className="flex-1 w-full max-w-3xl lg:max-w-4xl xl:max-w-[min(90vw,calc((100vh-200px)*16/9))] 2xl:max-w-[min(90vw,calc((100vh-200px)*16/9))]">
          {events.events.length > 0 && (
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="h-[500px] lg:hidden">
                {" "}
                {/* Mobile only */}
                <MyTimelineComponent
                  events={events.events}
                  scale={events.scale}
                  font={selectedFont}
                />
              </div>
              <div className="hidden lg:block relative w-full aspect-[16/9]">
                {" "}
                {/* Desktop with breakpoints */}
                <MyTimelineComponent
                  events={events.events}
                  scale={events.scale}
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 top-16 z-[60] overflow-y-auto"
          aria-labelledby="settings-modal"
          role="dialog"
        >
          <div className="min-h-[calc(100vh-4rem)] px-4 text-center">
            <div
              className="fixed inset-0 top-16 bg-black/30 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsSettingsOpen(false)}
            />

            {/* Modal panel */}
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Customize Timeline
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Font Selection */}
              <div className="mb-4">
                <label
                  htmlFor="font-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Timeline Font
                </label>
                <select
                  id="font-select"
                  value={selectedFont}
                  onChange={handleFontChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Scheme Selection */}
              <div>
                <label
                  htmlFor="color-scheme-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Color Scheme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => handleColorSchemeChange(scheme.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedColorScheme === scheme.id
                          ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex gap-1 h-6 mb-2">
                        {Object.values(scheme.colors)
                          .slice(0, 5)
                          .map((color, i) => (
                            <div
                              key={i}
                              className="w-full rounded"
                              style={{
                                backgroundColor: color.color,
                                borderColor: color.textColor,
                                borderWidth: 1,
                              }}
                            />
                          ))}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {scheme.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
                    {/* Warning icon */}
                    <svg
                      className="h-6 w-6 text-yellow-600 dark:text-yellow-200"
                      xmlns="http://www.w3.org/2000/svg"
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
        /* Hide TimelineJS loading elements after tip is shown */
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
