import { Redis } from "@upstash/redis";
import Link from "next/link";
import logger from "@/app/utils/logger";

// Initialize Redis
const redis = Redis.fromEnv();

// Define a TypeScript interface for the timeline data
interface TimelineEvent {
  date: string;
  headline: string;
  text?: string;
}

export default async function TimelineSEOPage({
  params,
}: {
  params: { pageName: string };
}) {
  const cacheKey = `timeline:${params.pageName}`;
  let data: { timeline: TimelineEvent[] } | null = null;

  try {
    data = (await redis.get(cacheKey)) as { timeline: TimelineEvent[] };
  } catch (error) {
    logger.error(
      `Failed to fetch timeline data for ${params.pageName}:`,
      error
    );
    return <div>Error loading timeline data.</div>;
  }

  if (!data || !data.timeline || data.timeline.length === 0) {
    return <div>No timeline data available.</div>;
  }

  logger.info(`Timeline data for ${params.pageName}:`, data);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl text-gray-600 font-bold mb-8">
        Timeline: {params.pageName.replace(/_/g, " ")}
      </h1>

      <Link
        href={`/timeline/${params.pageName}`}
        className="text-blue-600 hover:underline mb-8 block"
        aria-label={`View interactive timeline for ${params.pageName.replace(
          /_/g,
          " "
        )}`}
      >
        View Interactive Timeline
      </Link>

      <div className="space-y-8">
        {data.timeline.map((event, index) => {
          const isNegativeYear = event.date.startsWith("-");
          const normalizedDate = isNegativeYear
            ? event.date.slice(1)
            : event.date;
          const dateParts = normalizedDate.split("-");
          const year = parseInt(dateParts[0]) * (isNegativeYear ? -1 : 1);

          return (
            <article key={index} className="border-b pb-6">
              <time className="text-gray-600 block mb-2">
                {year}
                {dateParts[1] && `-${dateParts[1]}`}
                {dateParts[2] && `-${dateParts[2]}`}
              </time>

              <h2 className="text-xl text-gray-600 font-semibold mb-2">
                {event.headline}
              </h2>

              {event.text && <p className="text-gray-700 mb-4">{event.text}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { pageName: string };
}) {
  const title = decodeURIComponent(params.pageName).replace(/_/g, " ");

  return {
    title: `Timeline of ${title}`,
    description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
    openGraph: {
      title: `Timeline of ${title}`,
      description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
      type: "article",
    },
  };
}
