import { Redis } from "@upstash/redis";
import logger from "@/app/utils/logger";
import { SITE_CONFIG } from "@/app/config/site";

// Initialize Redis
const redis = Redis.fromEnv();

interface WikiPageSummary {
  pageUrl: string;
  thumbnail?: string;
  summary?: string;
  error?: string;
}

export async function generateMetadata({
  params,
}: {
  params: { pageName: string };
}) {
  const pageNames = decodeURIComponent(params.pageName)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const title = pageNames
    .map((name) => decodeURIComponent(name).replace(/_/g, " "))
    .join(", ");

  // Fetch summaries for all pages
  const summaryPromises = pageNames.map(async (pageName) => {
    try {
      const summary = await redis.get(`summary:${pageName}`) as WikiPageSummary | null;
      return summary;
    } catch (error) {
      logger.error(`Failed to fetch summary for ${pageName}:`, error);
      return null;
    }
  });

  const summaries = await Promise.all(summaryPromises);
  const validSummaries = summaries.filter((s): s is WikiPageSummary => s !== null);

  // Get thumbnails from summaries
  const images = validSummaries
    .map((summary) => summary.thumbnail)
    .filter((url): url is string => !!url);

  const url = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;
  const embedUrl = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/embed`;
  
  // Dynamic OG image URL
  const ogImageUrl = `${SITE_CONFIG.DOMAIN}/api/og?title=${encodeURIComponent(title)}`;

  return {
    title: `Timeline of ${title}`,
    description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
    openGraph: {
      title: `Timeline of ${title}`,
      description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
      images: [{
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `Timeline of ${title}`,
      }],
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `Timeline of ${title}`,
      description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
      images: [ogImageUrl],
    },
    alternates: {
      types: {
        'application/json+oembed': `${SITE_CONFIG.DOMAIN}/api/oembed?url=${encodeURIComponent(url)}`,
      },
    },
    other: {
      'reddit:embed:url': embedUrl,
      'reddit:embed:width': '800',
      'reddit:embed:height': '600',
    },
  };
}

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
