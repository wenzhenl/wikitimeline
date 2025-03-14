import EmbeddedTimeline from "@/app/components/EmbeddedTimeline";
import { SITE_CONFIG } from "@/app/config/site";
import { TimelineAPIResponse } from "@/app/types/timeline";
import { PAGE_DELIMITER } from "@/app/constants";
import { ERROR_MESSAGES } from "@/app/constants/errorMessages";
import logger from "@/app/utils/logger";
import { notFound } from "next/navigation";

async function getTimelineData(pageName: string) {
  try {
    // pageName is already encoded from the URL
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${pageName}`,
      {
        cache: "no-store",
        headers: {
          "x-api-key": process.env.API_SECRET_KEY!,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }

    const data: TimelineAPIResponse = await response.json();
    return data.results || {};
  } catch (error) {
    logger.error(
      `Failed to fetch timeline data for ${decodeURIComponent(pageName)}:`,
      error
    );
    return {};
  }
}

export default async function EmbedPage({
  params,
}: {
  params: { pageName: string };
}) {
  try {
    const timelines = await getTimelineData(params.pageName);

    // Check if we have any successful timelines
    const hasSuccessfulTimelines = Object.values(timelines).some(
      (timeline) => timeline.status === "success" && timeline.timeline
    );

    if (!hasSuccessfulTimelines) {
      logger.warn(`No successful timelines found for ${params.pageName}`);
    }

    return <EmbeddedTimeline timelines={timelines} />;
  } catch (error) {
    logger.error(`Error in EmbedPage:`, error);

    // Return a simple error component
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6 max-w-md">
          <div className="mb-4 text-yellow-500">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Timeline could not be displayed
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {ERROR_MESSAGES.TIMELINE_GENERATION_ERROR}
          </p>
        </div>
      </div>
    );
  }
}

export function generateMetadata({ params }: { params: { pageName: string } }) {
  const pageNames = decodeURIComponent(params.pageName)
    .split(PAGE_DELIMITER)
    .map((name) => name.trim())
    .filter(Boolean);

  const title = pageNames
    .map((name) => decodeURIComponent(name).replace(/_/g, " "))
    .join(PAGE_DELIMITER);

  return {
    title: `Timeline of ${title} - Embedded View`,
    description: `Interactive timeline visualization for ${title}, generated from Wikipedia content.`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`,
    },
  };
}
