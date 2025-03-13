import EmbeddedTimeline from "@/app/components/EmbeddedTimeline";
import { SITE_CONFIG } from "@/app/config/site";
import { TimelineAPIResponse } from "@/app/types/timeline";
import { PAGE_DELIMITER } from "@/app/constants";
import logger from "@/app/utils/logger";
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
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch timeline data");
    }

    const data: TimelineAPIResponse = await response.json();
    return data.results || {};
  } catch (error) {
    logger.error(
      `Failed to fetch timeline data for ${decodeURIComponent(pageName)}:`,
      error,
    );
    return {};
  }
}

export default async function EmbedPage({
  params,
}: {
  params: { pageName: string };
}) {
  const timelines = await getTimelineData(params.pageName);
  return <EmbeddedTimeline timelines={timelines} />;
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
