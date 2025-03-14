import TextTimelinePageContent from "@/app/components/TextTimelinePageContent";
import ErrorPage from "@/app/components/ErrorPage";
import logger from "@/app/utils/logger";
import { SITE_CONFIG } from "@/app/config/site";
import { ERROR_MESSAGES } from "@/app/constants/errorMessages";
import { TimelineAPIResponse } from "@/app/types/timeline";
import { PAGE_DELIMITER } from "@/app/constants";
import { compareDates } from "@/app/utils/helper";
import { notFound } from "next/navigation";

async function getTimelineData(pageName: string) {
  try {
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${encodeURIComponent(pageName)}`,
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

    const data = (await response.json()) as TimelineAPIResponse;

    logger.debug(`Fetched timeline data for ${decodeURIComponent(pageName)}`);

    // Filter successful results
    const successfulResults: Record<string, any> = {};
    Object.entries(data.results || {}).forEach(([pageName, result]) => {
      if (result.status === "success" && result.timeline) {
        successfulResults[pageName] = result;
      }
    });

    // Transform and sort all data
    const transformedData = {
      timeline: Object.entries(successfulResults)
        .flatMap(([pageName, page]) =>
          (page.timeline?.events || []).map((event: any) => ({
            date: event.startDate,
            headline: event.headline,
            text: event.description,
            source: pageName,
            age: event.age,
          }))
        )
        .sort((a, b) => compareDates(a.date, b.date)),
      titles: Object.fromEntries(
        Object.entries(successfulResults).map(([pageName, page]) => [
          pageName,
          page.timeline?.title || "",
        ])
      ),
      // Pass the original results for error handling in the client component
      results: data.results,
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
    // Decode the pageName once at the beginning
    const decodedPageName = decodeURIComponent(params.pageName);

    // Use the decoded pageName for data fetching
    const data = await getTimelineData(decodedPageName);

    // Show 404 if no timeline data or empty timeline
    if (!data || !data.timeline) {
      notFound();
    }

    // Create a new params object with the decoded pageName
    const decodedParams = {
      pageName: decodedPageName,
    };

    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
        <TextTimelinePageContent params={decodedParams} initialData={data} />
      </div>
    );
  } catch (error) {
    // Only show ErrorPage for non-404 errors
    if ((error as any)?.digest !== "NEXT_NOT_FOUND") {
      logger.error("Error in TimelineTextPage:", error);
      return <ErrorPage />;
    }
    throw error;
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
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`,
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
