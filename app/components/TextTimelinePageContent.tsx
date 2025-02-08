"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TextTimelineView from "@/app/components/TextTimelineView";
import html2canvas from "html2canvas";
import { SITE_CONFIG } from "@/app/config/site";
import ShareButtons from "@/app/components/ShareButtons";
import { PAGE_DELIMITER } from "@/app/constants";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TextTimelinePageContentProps {
  params: { pageName: string };
  searchParams: { active?: string };
  initialData: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  };
}

export default function TextTimelinePageContent({
  params,
  searchParams,
  initialData,
}: TextTimelinePageContentProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleCaptureImage = async () => {
    try {
      const timelineElement = document.querySelector("#timeline-content");
      if (!timelineElement) {
        console.error("Timeline element not found");
        return;
      }

      const canvas = await html2canvas(timelineElement as HTMLElement, {
        backgroundColor: null,
        scale: 2,
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("Failed to create blob from canvas");
          return;
        }

        try {
          // Download the image directly (no sharing)
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `timeline-${activePage.toLowerCase()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error downloading image:", error);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error capturing timeline:", error);
    }
  };

  // Split and decode the pageNames
  const pageNames = decodeURIComponent(params.pageName)
    .split(PAGE_DELIMITER)
    .map((name) => name.trim())
    .filter(Boolean);

  // Use the active param or first page
  const activePage = searchParams.active || pageNames[0];

  const pageUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text${
    searchParams.active ? `?active=${searchParams.active}` : ""
  }`;

  // Show loading state before hydration
  if (!isHydrated) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex-shrink-0">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 w-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-8 animate-pulse">
              <div className="space-y-4">
                <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>

              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="
                    p-6 
                    bg-white dark:bg-gray-800 
                    rounded-lg 
                    shadow-sm
                    border border-gray-100 dark:border-gray-700
                    space-y-3
                  "
                >
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Original render with all content
  return (
    <div className="flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
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
            <div className="hidden md:flex items-center w-full max-w-2xl ml-12 px-4">
              <div className="flex-1">
                {/* Empty space to match Customize Timeline position */}
              </div>

              <div className="flex gap-4 items-center">
                <Link
                  href={`/timeline/${params.pageName}`}
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Interactive View
                </Link>

                <ShareButtons
                  url={pageUrl}
                  title={`Timeline of ${decodeURIComponent(activePage).replace(
                    /_/g,
                    " "
                  )}`}
                  description={`📚 Read through the history of ${decodeURIComponent(
                    activePage
                  )
                    .replace(/_/g, " ")
                    .replace(
                      /,/g,
                      ", "
                    )} in chronological order! Powered by wiki-timeline.com`}
                  customAction={{
                    label: "Save as Image",
                    onClick: handleCaptureImage,
                  }}
                />

                <button
                  onClick={() => {
                    const pageNames = decodeURIComponent(
                      params.pageName
                    ).replace(/_/g, " ");
                    const timelineUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text`;
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
            <div className="md:hidden relative">
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
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                  <Link
                    href={`/timeline/${params.pageName}`}
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Interactive View
                  </Link>
                  <ShareButtons
                    url={pageUrl}
                    title={`Timeline of ${decodeURIComponent(
                      activePage
                    ).replace(/_/g, " ")}`}
                    description={`📚 Read through the history of ${decodeURIComponent(
                      activePage
                    )
                      .replace(/_/g, " ")
                      .replace(
                        /,/g,
                        ", "
                      )} in chronological order! Powered by wiki-timeline.com`}
                    customAction={{
                      label: "Save as Image",
                      onClick: handleCaptureImage,
                    }}
                  />
                  <button
                    onClick={() => {
                      const pageNames = decodeURIComponent(
                        params.pageName
                      ).replace(/_/g, " ");
                      const timelineUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text`;
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

      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div id="timeline-content">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {decodeURIComponent(activePage).replace(/_/g, " ")}
              </h1>
            </div>

            {pageNames.length > 1 && (
              <div className="min-h-[48px]">
                <Tabs pageNames={pageNames} currentPage={activePage} />
              </div>
            )}

            <div className="mt-8">
              <TextTimelineView data={initialData} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Tabs({
  pageNames,
  currentPage,
}: {
  pageNames: string[];
  currentPage: string;
}) {
  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="-mb-px flex flex-wrap gap-4" aria-label="Tabs">
        {pageNames.map((pageName) => {
          const isActive = pageName === currentPage;
          return (
            <Link
              key={pageName}
              href={`/timeline/${encodeURIComponent(
                pageNames.join(PAGE_DELIMITER)
              )}/text?active=${encodeURIComponent(pageName)}`}
              className={`
                py-2 px-3 rounded-lg font-medium text-sm transition-colors
                ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              {pageName.replace(/_/g, " ")}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
