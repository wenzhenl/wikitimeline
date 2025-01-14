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
import { TimelineAPIResponse, TimelineJSEvent } from "@/app/types/timeline";
import ShareButtons from "@/app/components/ShareButtons";
import LoadingUI from "@/app/components/LoadingUI";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineJSEvent[]>(
    formatTimelineEventsForInteractive(initialData.timelines, "default")
  );
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

  // Initialize selected pages from URL
  useEffect(() => {
    // Split by comma and handle encoded commas
    const pageNames = decodeURIComponent(params.pageName)
      .split(",")
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

  const handleColorSchemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScheme = e.target.value as ColorSchemeId;
    setSelectedColorScheme(newScheme);
    localStorage.setItem("timeline-color-scheme", newScheme);
  };

  const handleCopyEmbedCode = () => {
    const embedCode = `<iframe
  src="${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/embed"
  width="100%"
  height="600"
  frameborder="0"
  allow="fullscreen"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;

    navigator.clipboard
      .writeText(embedCode)
      .then(() => {
        // Optional: Show a toast notification
        alert("Embed code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy embed code:", err);
        // Fallback for browsers that don't support clipboard API
        const textarea = document.createElement("textarea");
        textarea.value = embedCode;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          alert("Embed code copied to clipboard!");
        } catch (err) {
          console.error("Fallback copy failed:", err);
          alert("Failed to copy embed code. Please try again.");
        }
        document.body.removeChild(textarea);
      });
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
          return decodeURIComponent(titleFromUrl.split("#")[0].split("?")[0]);
        }
        return null;
      })
      .filter(Boolean);

    if (pageNames.length > 0) {
      const newPath = `/timeline/${pageNames.join(",")}`;
      if (newPath !== `/timeline/${params.pageName}`) {
        setLoading(true); // Show loading state immediately
        router.push(newPath, { scroll: false }); // Add scroll: false to prevent page jump
      }
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
            >
              WikiTimeline
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={`/timeline/${params.pageName}/text`}
                className="text-blue-600 hover:text-blue-800"
              >
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
                  onClick: () => handleCopyEmbedCode(),
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
        </div>

        {/* Timeline Section */}
        {events.length > 0 && (
          <div className="relative w-full h-screen min-h-[600px] max-h-[1000px] lg:h-[750px]">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
              <label htmlFor="font-select" className="text-sm font-medium">
                Timeline Font:
              </label>
              <select
                id="font-select"
                value={selectedFont}
                onChange={handleFontChange}
                className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>

              <label
                htmlFor="color-scheme-select"
                className="text-sm font-medium ml-4"
              >
                Color Scheme:
              </label>
              <select
                id="color-scheme-select"
                value={selectedColorScheme}
                onChange={handleColorSchemeChange}
                className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              >
                {COLOR_SCHEMES.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 h-6 ml-2">
                {(
                  COLOR_SCHEMES.find((s) => s.id === selectedColorScheme) ||
                  COLOR_SCHEMES.find((s) => s.id === "default")
                )?.colors &&
                  Object.values(
                    (COLOR_SCHEMES.find((s) => s.id === selectedColorScheme) ||
                      COLOR_SCHEMES.find((s) => s.id === "default"))!.colors
                  )
                    .slice(0, 5)
                    .map((color, i) => (
                      <div
                        key={i}
                        className="w-4 rounded"
                        style={{
                          backgroundColor: color.color,
                          borderColor: color.textColor,
                          borderWidth: 1,
                        }}
                      />
                    ))}
              </div>
            </div>
            <MyTimelineComponent events={events} font={selectedFont} />

            {/* Move TimelineControls button inside timeline container */}
            <TimelineControls
              selectedPages={selectedPages}
              onPagesChange={setSelectedPages}
              onRefresh={handleTimelineRefresh}
              isExpanded={isExpanded}
              onExpandedChange={setIsExpanded}
            />
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
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowSkippedModal(false)}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
      `}</style>
    </div>
  );
}
