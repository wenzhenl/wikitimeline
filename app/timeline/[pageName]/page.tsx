import { SITE_CONFIG } from "@/app/config/site";
import { TimelineAPIResponse } from "@/app/types/timeline";
import InteractiveTimelineContent from "@/app/components/InteractiveTimelineContent";
import logger from "@/app/utils/logger";

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
    return (
      <InteractiveTimelineContent params={params} initialData={initialData} />
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

export function generateMetadata({ params }: { params: { pageName: string } }) {
  const title = decodeURIComponent(params.pageName).replace(/_/g, " ");

  return {
    title: `Timeline of ${title}`,
    description: `Interactive timeline showing the history of ${title}, generated from Wikipedia content.`,
  };
}
