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

interface SelectedPage {
  title: string;
  link: string;
}

// Add this type near the top with other interfaces
type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];

// Add this with other type definitions
type FontId = (typeof AVAILABLE_FONTS)[number]["value"];

export default function TimelinePage({
  params,
}: {
  params: { pageName: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineJSEvent[]>([]);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [selectedFont, setSelectedFont] = useState<FontId>(
    AVAILABLE_FONTS[0].value
  );
  const [selectedColorScheme, setSelectedColorScheme] =
    useState<ColorSchemeId>("default");
  const [showEmbed, setShowEmbed] = useState(false);
  const [skippedPages, setSkippedPages] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  // Update the fetch logic
  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/timeline/${params.pageName}`);
        if (!response.ok) {
          throw new Error("Failed to fetch timeline data");
        }

        const data: TimelineAPIResponse = await response.json();

        if (!data.timelines || Object.keys(data.timelines).length === 0) {
          throw new Error("No timeline data could be generated");
        }

        setEvents(
          formatTimelineEventsForInteractive(
            data.timelines,
            selectedColorScheme
          )
        );
        if (data.errors?.failedPages) {
          setSkippedPages(data.errors.failedPages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [params.pageName, selectedColorScheme]);

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
        router.push(newPath, { scroll: false });
      }

      setLoading(true);
      setError(null);
      fetch(`/api/timeline/${pageNames.join(",")}`)
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch timeline data");
          return response.json();
        })
        .then((data: TimelineAPIResponse) => {
          if (!data.timelines || Object.keys(data.timelines).length === 0) {
            throw new Error("No timeline data could be generated");
          }
          setEvents(
            formatTimelineEventsForInteractive(
              data.timelines,
              selectedColorScheme
            )
          );
          if (data.errors?.failedPages) {
            setSkippedPages(data.errors.failedPages);
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "An error occurred");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
          Generating Timeline...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
          Please wait while we analyze and process the Wikipedia content into a
          beautiful timeline
        </p>
      </div>
    );
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
                  label: "Get Embed Code",
                  onClick: () => undefined,
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

        {/* Show skipped pages warning if any */}
        {skippedPages.length > 0 && (
          <div className="fixed top-20 right-4 z-50 bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg shadow-lg max-w-md">
            <h4 className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              Some pages were skipped
            </h4>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              No timeline data could be extracted from:{" "}
              {skippedPages.map((page) => decodeURIComponent(page)).join(", ")}
            </p>
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
