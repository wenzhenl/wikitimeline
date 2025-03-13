import { SITE_CONFIG } from "@/app/config/site";
import { TimelineAPIResponse } from "@/app/types/timeline";
import InteractiveTimelineContent from "@/app/components/InteractiveTimelineContent";
import ErrorPage from "@/app/components/ErrorPage";
import logger from "@/app/utils/logger";
import { notFound } from "next/navigation";

async function getTimelineData(pageName: string) {
  try {
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${pageName}`,
      {
        cache: "no-store",
        headers: {
          "x-api-key": process.env.API_SECRET_KEY!,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }

    const data: TimelineAPIResponse = await response.json();
    logger.debug(`Fetched timeline data for ${decodeURIComponent(pageName)}`);

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

    // Show 404 if no timeline data or empty timelines
    if (
      !initialData ||
      !initialData.timelines ||
      Object.keys(initialData.timelines).length === 0 ||
      Object.values(initialData.timelines).every(
        (timeline) => !timeline?.timeline?.events?.length,
      )
    ) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <InteractiveTimelineContent params={params} initialData={initialData} />
      </div>
    );
  } catch (error) {
    // Only show ErrorPage for non-404 errors
    if ((error as any)?.digest !== "NEXT_NOT_FOUND") {
      return <ErrorPage />;
    }
    throw error;
  }
}
