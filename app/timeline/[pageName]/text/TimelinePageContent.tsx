"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TimelineView from "./TimelineView";
import html2canvas from "html2canvas";
import { deviceDetection } from "@/app/utils/deviceDetection";
import { SITE_CONFIG } from "@/app/config/site";
import ShareButtons from "@/app/components/ShareButtons";

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
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  // Split and decode the pageNames
  const pageNames = decodeURIComponent(params.pageName)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  // Use the active param or first page
  const activePage = searchParams.active || pageNames[0];

  const pageUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text${
    searchParams.active ? `?active=${searchParams.active}` : ""
  }`;

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
                  )} in chronological order! Powered by wiki-timeline.com - Turn Wikipedia pages into beautiful, interactive timelines ⚡️`}
              />
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
