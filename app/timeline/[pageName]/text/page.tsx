import { Redis } from "@upstash/redis";
import TimelinePageContent from "./TimelinePageContent";
import logger from "@/app/utils/logger";

// Initialize Redis
const redis = Redis.fromEnv();

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

async function getTimelineData(pageName: string) {
  const cacheKey = `timeline:${decodeURIComponent(pageName)}`;
  try {
    const data = (await redis.get(cacheKey)) as {
      timeline: TimelineEvent[];
      errors?: { failedPages: string[] };
    };
    logger.info(`Fetched timeline data for ${pageName}`);

    // Sort the timeline events
    if (data?.timeline) {
      data.timeline.sort((a, b) => {
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
      });
    }
    return data;
  } catch (error) {
    logger.error(`Failed to fetch timeline data for ${pageName}:`, error);
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
  const data = await getTimelineData(searchParams.active || params.pageName);

  return (
    <TimelinePageContent
      params={params}
      searchParams={searchParams}
      initialData={data}
    />
  );
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
