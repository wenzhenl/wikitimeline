import TextTimelinePageContent from "@/app/components/TextTimelinePageContent";
import logger from "@/app/utils/logger";
import { SITE_CONFIG } from "@/app/config/site";

import { TimelineAPIResponse } from "@/app/types/timeline";
import { PAGE_DELIMITER } from "@/app/constants";

function compareDates(dateA: string, dateB: string): number {
  const aIsNegative = dateA.startsWith("-");
  const bIsNegative = dateB.startsWith("-");

  const aParts = (aIsNegative ? dateA.slice(1) : dateA).split("-").map(Number);
  const bParts = (bIsNegative ? dateB.slice(1) : dateB).split("-").map(Number);

  const aYear = aParts[0] * (aIsNegative ? -1 : 1);
  const bYear = bParts[0] * (bIsNegative ? -1 : 1);

  if (aYear !== bYear) return aYear - bYear;
  if (aParts[1] && bParts[1] && aParts[1] !== bParts[1])
    return aParts[1] - bParts[1];
  if (aParts[2] && bParts[2]) return aParts[2] - bParts[2];
  return 0;
}

async function getTimelineData(pageName: string) {
  const targetPages = decodeURIComponent(pageName).split(PAGE_DELIMITER);

  try {
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${encodeURIComponent(
        targetPages.join(PAGE_DELIMITER)
      )}`,
      {
        cache: "no-store",
        headers: {
          "x-api-key": process.env.API_SECRET_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }

    const data = (await response.json()) as TimelineAPIResponse;

    // Transform and sort all data
    const transformedData = {
      timeline: Object.entries(data.timelines)
        .flatMap(([pageName, page]) =>
          page.timeline.events.map((event) => ({
            date: event.startDate,
            headline: event.headline,
            text: event.description,
            source: pageName,
            age: event.age,
          }))
        )
        .sort((a, b) => compareDates(a.date, b.date)),
      errors: data.errors,
    };

    return transformedData;
  } catch (error) {
    logger.error(`Failed to fetch timeline data:`, error);
    throw error;
  }
}

export default async function TimelineTextPage({
  params,
}: {
  params: { pageName: string };
}) {
  try {
    const data = await getTimelineData(params.pageName);

    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
        <TextTimelinePageContent
          params={params}
          initialData={data || { timeline: [], errors: { failedPages: [] } }}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 max-w-4xl mx-auto px-4 py-8">
          <div className="p-4 bg-red-50 dark:bg-red-900/50 rounded">
            <p className="text-red-800 dark:text-red-200">
              Error loading timeline data.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export function generateMetadata({ params }: { params: { pageName: string } }) {
  const pageNames = decodeURIComponent(params.pageName)
    .split(PAGE_DELIMITER)
    .map((name) => name.trim());

  const allPages = pageNames
    .map((name) => decodeURIComponent(name).replace(/_/g, " "))
    .join(", ");

  return {
    title: `Historical Timeline of ${allPages} - Chronological History & Key Events (Text Version)`,
    description: `Read the complete historical timeline of ${allPages} in text format. A detailed chronological record of significant events, dates, and historical milestones, sourced from Wikipedia. Perfect for research and historical reference.`,
    keywords: `${allPages} history, ${allPages} chronology, historical events, historical timeline, key dates, historical research, historical record`,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Historical Timeline of ${allPages} - Chronological History & Key Events`,
      description: `Comprehensive historical timeline of ${allPages} in text format. A detailed chronological record of significant events and dates throughout history.`,
      type: "article",
      url: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Historical Timeline of ${allPages} - Chronological History`,
      description: `Detailed historical timeline showing key events and dates throughout the history of ${allPages}. Text-based format ideal for research.`,
    },
  };
}
