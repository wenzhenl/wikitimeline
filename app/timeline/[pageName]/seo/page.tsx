import { Redis } from "@upstash/redis";
import Link from "next/link";

// Initialize Redis
const redis = Redis.fromEnv();

export default async function TimelineSEOPage({
  params,
}: {
  params: { pageName: string };
}) {
  const cacheKey = `timeline:${params.pageName}`;
  const data = (await redis.get(cacheKey)) as { timeline: any[] };

  if (!data || !data.timeline || data.timeline.length === 0) {
    return <div>No timeline data available.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Timeline: {decodeURIComponent(params.pageName).replace(/_/g, " ")}
      </h1>

      <Link
        href={`/timeline/${params.pageName}`}
        className="text-blue-600 hover:underline mb-8 block"
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

              <h2 className="text-xl font-semibold mb-2">
                {event.text.headline}
              </h2>

              {event.text.text && (
                <p className="text-gray-700 mb-4">{event.text.text}</p>
              )}

              {event.group && (
                <div className="text-sm text-gray-500">
                  Category: {event.group}
                </div>
              )}

              {event.media?.url && (
                <div className="mt-4">
                  <a
                    href={event.media.url}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Related Media
                  </a>
                </div>
              )}
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
