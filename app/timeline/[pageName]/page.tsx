import { SITE_CONFIG } from "@/app/config/site";
import { TimelineAPIResponse } from "@/app/types/timeline";
import InteractiveTimelineContent from "@/app/components/InteractiveTimelineContent";
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
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }

    const data: TimelineAPIResponse = await response.json();
    // logger.debug("Fetched timeline data from API:", JSON.stringify(data, null, 2));
    logger.info(`Fetched timeline data for ${decodeURIComponent(pageName)}`);

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
    title: `Historical Timeline of ${title} - Chronological Events & History`,
    description: `Explore the complete historical timeline of ${title}. A comprehensive chronological overview of key events, dates, and milestones throughout history, sourced from Wikipedia. Interactive visualization of historical data.`,
    keywords: `${title} history, ${title} timeline, historical events, chronology, ${title} chronological order, historical dates, ${title} key events, historical milestones`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/text`,
    },
    openGraph: {
      title: `Historical Timeline of ${title} - Chronological Events & History`,
      description: `Explore the complete historical timeline of ${title}. A comprehensive chronological overview of key events, dates, and milestones throughout history.`,
      type: "article",
      url: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Historical Timeline of ${title} - Chronological Events`,
      description: `Comprehensive historical timeline showing key events and dates throughout the history of ${title}.`,
    },
  };
}
