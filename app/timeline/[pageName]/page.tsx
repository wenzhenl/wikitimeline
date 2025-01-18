import { SITE_CONFIG } from "@/app/config/site";
import { TimelineAPIResponse } from "@/app/types/timeline";
import InteractiveTimelineContent from "@/app/components/InteractiveTimelineContent";
import logger from "@/app/utils/logger";
import { notFound } from "next/navigation";

async function getTimelineData(pageName: string) {
  try {
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${encodeURIComponent(pageName)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }

    const data: TimelineAPIResponse = await response.json();
    logger.info(`Fetched timeline data for ${pageName}`);

    return data;
  } catch (error) {
    logger.error("Error fetching timeline data:", error);
    throw error;
  }
}

export default async function TimelinePage({
  params,
}: {
  params: { pageName: string };
}) {
  try {
    const initialData = await getTimelineData(params.pageName);

    // If we got a successful response but no timeline data, show 404
    if (
      !initialData.timelines ||
      Object.keys(initialData.timelines).length === 0
    ) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <InteractiveTimelineContent params={params} initialData={initialData} />
      </div>
    );
  } catch (error) {
    // Only catch non-NEXT_NOT_FOUND errors
    if ((error as any)?.digest !== "NEXT_NOT_FOUND") {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="p-4 bg-red-50 dark:bg-red-900/50 rounded">
              <p className="text-red-800 dark:text-red-200">
                Error loading timeline data.
              </p>
            </div>
          </div>
        </div>
      );
    }
    throw error;
  }
}

export function generateMetadata({ params }: { params: { pageName: string } }) {
  const title = decodeURIComponent(params.pageName).replace(/_/g, " ");

  return {
    title: `Timeline of ${title}`,
    description: `Interactive timeline showing the history of ${title}, generated from Wikipedia content.`,
  };
}
