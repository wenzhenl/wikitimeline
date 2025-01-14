import TextTimelinePageContent from "@/app/components/TextTimelinePageContent";
import logger from "@/app/utils/logger";
import { SITE_CONFIG } from "@/app/config/site";

import { TimelineAPIResponse } from "@/app/types/timeline";

async function getTimelineData(pageName: string, activePageName?: string) {
  const targetPage = activePageName || pageName.split(",")[0];

  try {
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${encodeURIComponent(targetPage)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }

    const data: TimelineAPIResponse = await response.json();
    logger.info(`Fetched timeline data for ${targetPage}`);

    // Transform API response to text format
    const transformedData = {
      timeline: Object.values(data.timelines)
        .flatMap((page) =>
          page.timeline.map((event) => ({
            date: event.date,
            headline: event.headline,
            text: event.text,
          }))
        )
        .sort((a, b) => {
          const aIsNegative = a.date.startsWith("-");
          const bIsNegative = b.date.startsWith("-");
          const aParts = (aIsNegative ? a.date.slice(1) : a.date)
            .split("-")
            .map(Number);
          const bParts = (bIsNegative ? b.date.slice(1) : b.date)
            .split("-")
            .map(Number);
          const aYear = aParts[0] * (aIsNegative ? -1 : 1);
          const bYear = bParts[0] * (bIsNegative ? -1 : 1);

          if (aYear !== bYear) return aYear - bYear;
          if (aParts[1] && bParts[1] && aParts[1] !== bParts[1])
            return aParts[1] - bParts[1];
          if (aParts[2] && bParts[2]) return aParts[2] - bParts[2];
          return aParts.length - bParts.length;
        }),
      errors: data.errors,
    };

    return transformedData;
  } catch (error) {
    logger.error(`Failed to fetch timeline data for ${targetPage}:`, error);
    throw error;
  }
}

export default async function TimelineTextPage({
  params,
  searchParams,
}: {
  params: { pageName: string };
  searchParams: { active?: string };
}) {
  try {
    // First decode the pageName, then split it
    const defaultPage = decodeURIComponent(params.pageName).split(",")[0];
    const data = await getTimelineData(
      defaultPage,
      searchParams.active || defaultPage
    );
    logger.debug("Server-side data:", {
      defaultPage,
      active: searchParams.active,
      data,
    });
    return (
      <TextTimelinePageContent
        params={params}
        searchParams={{
          ...searchParams,
          active: searchParams.active || defaultPage,
        }}
        initialData={data || { timeline: [], errors: { failedPages: [] } }}
      />
    );
  } catch (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/50 rounded">
        <p className="text-red-800 dark:text-red-200">
          Error loading timeline data.
        </p>
      </div>
    );
  }
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
