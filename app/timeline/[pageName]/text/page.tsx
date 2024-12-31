import { Redis } from "@upstash/redis";
import Link from "next/link";
import { Suspense } from "react";
import logger from "@/app/utils/logger";
import TimelineView from "./TimelineView";

// Initialize Redis
const redis = Redis.fromEnv();

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TabProps {
  pageNames: string[];
  currentPage: string;
}

function Tabs({ pageNames, currentPage }: TabProps) {
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

async function TimelineContent({ pageName }: { pageName: string }) {
  const cacheKey = `timeline:${decodeURIComponent(pageName)}`;
  let data = null;

  try {
    data = (await redis.get(cacheKey)) as {
      timeline: TimelineEvent[];
      errors?: { failedPages: string[] };
    };
    logger.info(`Fetched timeline data for ${pageName}`);

    // Sort the timeline events
    if (data?.timeline) {
      data.timeline.sort((a, b) => {
        // Handle negative years (BC)
        const aIsNegative = a.date.startsWith("-");
        const bIsNegative = b.date.startsWith("-");

        // Remove negative sign and split into parts
        const aParts = (aIsNegative ? a.date.slice(1) : a.date)
          .split("-")
          .map(Number);
        const bParts = (bIsNegative ? b.date.slice(1) : b.date)
          .split("-")
          .map(Number);

        // Compare years first (considering BC)
        const aYear = aParts[0] * (aIsNegative ? -1 : 1);
        const bYear = bParts[0] * (bIsNegative ? -1 : 1);
        if (aYear !== bYear) return aYear - bYear;

        // If years are equal, compare months (if they exist)
        if (aParts[1] && bParts[1] && aParts[1] !== bParts[1]) {
          return aParts[1] - bParts[1];
        }

        // If months are equal or non-existent, compare days (if they exist)
        if (aParts[2] && bParts[2]) {
          return aParts[2] - bParts[2];
        }

        // If one date has more precision than the other, put the less precise one first
        return aParts.length - bParts.length;
      });
    }
  } catch (error) {
    logger.error(`Failed to fetch timeline data for ${pageName}:`, error);
    return <div>Error loading timeline data.</div>;
  }

  if (!data || !data.timeline || data.timeline.length === 0) {
    return (
      <div className="p-4">
        No timeline data available for{" "}
        {decodeURIComponent(pageName).replace(/_/g, " ")}.
      </div>
    );
  }

  return <TimelineView data={data} />;
}

export default function TimelineTextPage({
  params,
  searchParams,
}: {
  params: { pageName: string };
  searchParams: { active?: string };
}) {
  // Split and decode the pageNames, and remove empty strings
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
              <button className="text-blue-600 hover:text-blue-800">
                Share
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {decodeURIComponent(activePage).replace(/_/g, " ")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Timeline events</p>
        </div>

        {/* Always show tabs if there are multiple pages */}
        {pageNames.length > 1 && (
          <Tabs pageNames={pageNames} currentPage={activePage} />
        )}

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            }
          >
            <TimelineContent pageName={activePage} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { pageName: string };
  searchParams: { active?: string };
}) {
  const pageNames = params.pageName.split(",").map((name) => name.trim());
  const activePage = searchParams.active || pageNames[0];
  const title = decodeURIComponent(activePage).replace(/_/g, " ");

  return {
    title: `Timeline of ${title} - Text Version`,
    description: `Text version of the historical timeline for ${title}, generated from Wikipedia content.`,
  };
}
