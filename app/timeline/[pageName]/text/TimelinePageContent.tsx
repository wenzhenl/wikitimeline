"use client";

import { useState } from "react";
import Link from "next/link";
import TimelineView from "./TimelineView";
import html2canvas from "html2canvas";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TimelinePageContentProps {
  params: { pageName: string };
  searchParams: { active?: string };
  initialData: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  };
}

export default function TimelinePageContent({
  params,
  searchParams,
  initialData,
}: TimelinePageContentProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleShare = async () => {
    setIsSaving(true);
    try {
      const timelineElement = document.querySelector("#timeline-content");
      if (!timelineElement) return;

      const canvas = await html2canvas(timelineElement as HTMLElement, {
        backgroundColor: null,
        scale: 2,
      });

      if (navigator.share && canvas.toBlob) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            const file = new File([blob], "timeline.png", {
              type: "image/png",
            });
            await navigator.share({
              files: [file],
              title: "Timeline",
              text: "Check out this timeline!",
            });
          } catch (error) {
            console.error("Error sharing:", error);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = `${params.pageName}-timeline.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, "image/png");
      } else {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `${params.pageName}-timeline.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }, "image/png");
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Split and decode the pageNames
  const pageNames = decodeURIComponent(params.pageName)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  // Use the active param or first page
  const activePage = searchParams.active || pageNames[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
                href={`/timeline/${params.pageName}`}
                className="text-blue-600 hover:text-blue-800"
              >
                Interactive
              </Link>
              <button
                onClick={handleShare}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Share"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8 pt-24" id="timeline-content">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {decodeURIComponent(activePage).replace(/_/g, " ")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Timeline events</p>
        </div>

        {pageNames.length > 1 && (
          <Tabs pageNames={pageNames} currentPage={activePage} />
        )}

        <div className="mt-8">
          <TimelineView data={initialData} />
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
                pageNames.join(",")
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
