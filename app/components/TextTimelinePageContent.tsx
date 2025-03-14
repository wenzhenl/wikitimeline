"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TextTimelineView from "@/app/components/TextTimelineView";
import html2canvas from "html2canvas";
import { SITE_CONFIG } from "@/app/config/site";
import ShareButtons from "@/app/components/ShareButtons";
import { PAGE_DELIMITER } from "@/app/constants";
import { ERROR_MESSAGES } from "@/app/constants/errorMessages";
import ReportIssueButton from "@/app/components/ReportIssueButton";
import NavigationHeader from "@/app/components/NavigationHeader";
import SkippedPagesModal from "@/app/components/SkippedPagesModal";
import logger from "@/app/utils/logger";
import { formatPageName } from "@/app/utils/helper";

interface TextTimelinePageContentProps {
  params: { pageName: string };
  initialData: {
    timeline: Array<{
      date: string;
      headline: string;
      text: string;
      source: string;
      age?: number;
    }>;
    titles?: Record<string, string>;
    errors?: {
      message: string;
      failedPages: string[];
      details?: {
        noWikipediaData: string[];
        noTimelineGenerated: string[];
      };
    };
    results?: Record<
      string,
      {
        status: string;
        message?: string;
      }
    >;
  };
}

export default function TextTimelinePageContent({
  params,
  initialData,
}: TextTimelinePageContentProps) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"combined" | "tabs">("combined");
  const [activePage, setActivePage] = useState("");
  const [skippedPages, setSkippedPages] = useState<
    Array<{ pageName: string; reason: string }>
  >([]);
  const [showSkippedModal, setShowSkippedModal] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isInitialized = useRef(false);

  const pageNames = decodeURIComponent(params.pageName)
    .split(PAGE_DELIMITER)
    .map((name) => name.trim())
    .filter(Boolean);

  useEffect(() => {
    setIsHydrated(true);
    if (!isInitialized.current) {
      setActivePage(pageNames[0]);
      isInitialized.current = true;
    }
  }, []);

  // Process skipped pages from initialData
  useEffect(() => {
    // Check if there are any failed pages in the results
    if (initialData.results) {
      const failedPages: Array<{ pageName: string; reason: string }> = [];

      // Iterate through all pages in the results
      Object.entries(initialData.results).forEach(([pageName, result]) => {
        // If the status is not "success", add to failed pages with appropriate generic message
        if (result.status !== "success") {
          let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;

          // Map status to appropriate error message
          if (result.status === "error") {
            errorMessage = ERROR_MESSAGES.TIMELINE_GENERATION_ERROR;
          } else if (result.status === "not_found") {
            errorMessage = ERROR_MESSAGES.PAGE_NOT_FOUND;
          } else if (result.status === "not_implemented") {
            errorMessage = ERROR_MESSAGES.NOT_IMPLEMENTED;
          }

          failedPages.push({
            pageName,
            reason: errorMessage,
          });

          logger.warn(
            `Page "${pageName}" failed with status: ${result.status}`,
            {
              message: result.message,
            }
          );
        }
      });

      // Update skipped pages state if there are any failed pages
      if (failedPages.length > 0) {
        setSkippedPages(failedPages);
        setShowSkippedModal(true);
        logger.debug(`Found ${failedPages.length} skipped pages`, {
          failedPages,
        });
      }
    } else if (
      initialData.errors?.failedPages &&
      initialData.errors.failedPages.length > 0
    ) {
      // Handle legacy error format
      const failedPages = initialData.errors.failedPages.map((pageName) => ({
        pageName,
        reason: ERROR_MESSAGES.TIMELINE_GENERATION_ERROR,
      }));

      setSkippedPages(failedPages);
      setShowSkippedModal(true);
      logger.debug(
        `Found ${failedPages.length} skipped pages (legacy format)`,
        {
          failedPages,
        }
      );
    }
  }, [initialData]);

  const handleSkippedModalClose = () => {
    setShowSkippedModal(false);

    // If there are skipped pages, update the URL to remove them
    if (skippedPages.length > 0) {
      // Get all page names from the URL
      const allPageNames = decodeURIComponent(params.pageName)
        .split(PAGE_DELIMITER)
        .map((name) => name.trim())
        .filter(Boolean);

      // Filter out the skipped pages
      const validPages = allPageNames
        .filter(
          (page) => !skippedPages.some((skipped) => skipped.pageName === page)
        )
        .map((page) => encodeURIComponent(page))
        .join(PAGE_DELIMITER);

      // Only update the URL if there are valid pages left
      if (validPages) {
        logger.debug("Updating URL to remove skipped pages", {
          originalPages: allPageNames,
          skippedPages: skippedPages.map((p) => p.pageName),
          validPages: validPages.split(PAGE_DELIMITER),
        });
        router.replace(`/timeline/${validPages}/text`, { scroll: false });
      } else {
        // If no valid pages left, redirect to home
        logger.debug("No valid pages left, redirecting to home");
        router.replace("/");
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOptionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCaptureImage = async () => {
    try {
      const timelineElement = document.querySelector("#timeline-content");
      if (!timelineElement) {
        logger.error("Timeline element not found");
        return;
      }

      const canvas = await html2canvas(timelineElement as HTMLElement, {
        backgroundColor: null,
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          logger.error("Failed to create blob from canvas");
          return;
        }

        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `timeline-${activePage.toLowerCase()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          logger.error("Error downloading image:", error);
        }
      }, "image/png");
    } catch (error) {
      logger.error("Error capturing timeline:", error);
    }
  };

  const handleTabClick = (pageName: string) => {
    setActivePage(pageName);
  };

  const pageUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text`;

  // Handle navigation to interactive view
  const handleViewChange = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute("href");
    if (href) {
      setIsNavigating(true);
      logger.debug("Navigating to interactive view", { href });
      router.push(href);
    }
  };

  // Show loading state when navigating
  if (isNavigating) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavigationHeader zIndex="z-[10001]" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Changing view...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
        <NavigationHeader />
        <main className="flex-1 w-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Empty container with same dimensions as content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavigationHeader>
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center w-full">
          <div className="flex-1"></div>
          <div className="flex gap-4 items-center">
            {pageNames.length > 1 && (
              <button
                onClick={() =>
                  setViewMode(viewMode === "combined" ? "tabs" : "combined")
                }
                className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {viewMode === "combined" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12M8 12h12M8 17h12M4 7h0M4 12h0M4 17h0"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v12M3 13l3 3m0 0l3-3m-3 3V8m12-1l-3-3m0 0l-3 3m3-3v8"
                    />
                  )}
                </svg>
                {viewMode === "combined"
                  ? "Separate Timelines"
                  : "Merge Timelines"}
              </button>
            )}

            <Link
              href={`/timeline/${params.pageName}`}
              className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg whitespace-nowrap"
              onClick={handleViewChange}
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
              url={`${SITE_CONFIG.DOMAIN}/timeline/${pageNames}/share`}
              title={`Timeline of ${pageNames
                .map((name) => formatPageName(name).formattedName)
                .join(" | ")}`}
              description={`📚 Read through the history of ${pageNames
                .map((name) => formatPageName(name).formattedName)
                .join(" | ")} in chronological order!`}
              customAction={{
                label: "Save as Image",
                onClick: handleCaptureImage,
              }}
            />

            <ReportIssueButton pageName={params.pageName} />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden relative flex justify-end w-full">
          <button
            ref={buttonRef}
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
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50"
            >
              {pageNames.length > 1 && (
                <button
                  onClick={() => {
                    setViewMode(viewMode === "combined" ? "tabs" : "combined");
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
                    {viewMode === "combined" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12M8 12h12M8 17h12M4 7h0M4 12h0M4 17h0"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v12M3 13l3 3m0 0l3-3m-3 3V8m12-1l-3-3m0 0l-3 3m3-3v8"
                      />
                    )}
                  </svg>
                  {viewMode === "combined"
                    ? "Separate Timelines"
                    : "Merge Timelines"}
                </button>
              )}

              <Link
                href={`/timeline/${params.pageName}`}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={handleViewChange}
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
                url={`${SITE_CONFIG.DOMAIN}/timeline/${pageNames}/share`}
                title={`Timeline of ${pageNames
                  .map((name) => formatPageName(name).formattedName)
                  .join(" | ")}`}
                description={`📚 Read through the history of ${pageNames
                  .map((name) => formatPageName(name).formattedName)
                  .join(" | ")} in chronological order!`}
                customAction={{
                  label: "Save as Image",
                  onClick: handleCaptureImage,
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

      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div id="timeline-content">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {viewMode === "combined"
                  ? pageNames
                      .map((name) => formatPageName(name).formattedName)
                      .join(` ${PAGE_DELIMITER} `)
                  : formatPageName(activePage).formattedName}
              </h1>
            </div>

            {pageNames.length > 1 && viewMode === "tabs" && (
              <div className="min-h-[48px]">
                <div className="border-b border-gray-200 mb-8">
                  <nav
                    className="-mb-px flex flex-wrap gap-4"
                    aria-label="Tabs"
                  >
                    {pageNames.map((pageName) => {
                      const isActive = pageName === activePage;
                      return (
                        <button
                          key={pageName}
                          onClick={() => handleTabClick(pageName)}
                          className={`
                            py-2 px-3 rounded-lg font-medium text-sm transition-colors
                            ${
                              isActive
                                ? "bg-blue-50 text-blue-600 border border-blue-200"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            }
                          `}
                        >
                          {formatPageName(pageName).formattedName}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            )}

            <div className="mt-8">
              <TextTimelineView
                data={initialData}
                viewMode={viewMode}
                showSource={viewMode === "combined" && pageNames.length > 1}
                activePage={activePage}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Skipped Pages Modal */}
      <SkippedPagesModal
        skippedPages={skippedPages}
        showModal={showSkippedModal}
        onClose={handleSkippedModalClose}
      />
    </div>
  );
}
