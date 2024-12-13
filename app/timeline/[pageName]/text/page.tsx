import { Redis } from "@upstash/redis";
import Link from "next/link";
import { Suspense } from 'react';
import logger from "@/app/utils/logger";

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
              href={`/timeline/${encodeURIComponent(pageNames.join(','))}/text?active=${encodeURIComponent(pageName)}`}
              className={`
                py-2 px-3 rounded-lg font-medium text-sm transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
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
    data = await redis.get(cacheKey) as { timeline: TimelineEvent[], errors?: { failedPages: string[] } };
    logger.info(`Fetched timeline data for ${pageName}`);
  } catch (error) {
    logger.error(`Failed to fetch timeline data for ${pageName}:`, error);
    return <div>Error loading timeline data.</div>;
  }
  
  if (!data || !data.timeline || data.timeline.length === 0) {
    return <div className="p-4">No timeline data available for {decodeURIComponent(pageName).replace(/_/g, " ")}.</div>;
  }

  return (
    <div className="space-y-8">
      {data.timeline.map((event: TimelineEvent, index: number) => {
        const isNegativeYear = event.date.startsWith("-");
        const normalizedDate = isNegativeYear ? event.date.slice(1) : event.date;
        const dateParts = normalizedDate.split("-");
        const year = parseInt(dateParts[0]) * (isNegativeYear ? -1 : 1);
        
        return (
          <article key={index} className="border-b pb-6">
            <time className="text-gray-600 block mb-2">
              {year} 
              {dateParts[1] && `-${dateParts[1]}`}
              {dateParts[2] && `-${dateParts[2]}`}
            </time>
            
            <h2 className="text-xl font-semibold mb-2">
              {event.headline}
            </h2>
            
            {event.text && (
              <p className="text-gray-700 mb-4">{event.text}</p>
            )}
          </article>
        );
      })}

      {data.errors?.failedPages && data.errors.failedPages.length > 0 && (
        <div className="mt-8 p-4 bg-yellow-50 rounded">
          <p className="text-yellow-800">
            Note: Could not include data from: {data.errors.failedPages.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default async function TimelineSEOPage({
  params,
  searchParams,
}: {
  params: { pageName: string };
  searchParams: { active?: string };
}) {
  // Split and decode the pageNames, and remove empty strings
  const pageNames = decodeURIComponent(params.pageName)
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);

  // Use the active param or first page
  const activePage = searchParams.active || pageNames[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-gray-900"
            >
              WikiTimeline
            </Link>
            <Link
              href={`/timeline/${params.pageName}`}
              className="text-blue-600 hover:text-blue-800"
            >
              View Interactive Timeline
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {decodeURIComponent(activePage).replace(/_/g, " ")}
          </h1>
          <p className="text-gray-600">
            Timeline events from Wikipedia
          </p>
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
  const pageNames = params.pageName.split(',').map(name => name.trim());
  const activePage = searchParams.active || pageNames[0];
  const title = decodeURIComponent(activePage).replace(/_/g, " ");
  
  return {
    title: `Timeline of ${title} - Text Version`,
    description: `Text version of the historical timeline for ${title}, generated from Wikipedia content.`,
  };
}
