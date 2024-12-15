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

  return {
    title: `Timeline of ${title}`,
    description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
    twitter: {
      card: "summary_large_image",
      title: `Timeline of ${title}`,
      description: `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
      images: images.length > 0 ? [images[0]] : undefined,
    },
    alternates: {
      types: {
        // oEmbed endpoint
        'application/json+oembed': `${SITE_CONFIG.DOMAIN}/api/oembed?url=${encodeURIComponent(url)}`,
      },
    },
    other: {
      // Reddit embed specific meta tags
      'reddit:embed:url': embedUrl,
      'reddit:embed:width': '800',
      'reddit:embed:height': '600',
      // oEmbed discovery tags
      'oembed:type': 'rich',
      'oembed:url': url,
      'oembed:provider_name': 'WikiTimeline',
      'oembed:provider_url': SITE_CONFIG.DOMAIN,
      'oembed:title': `Timeline of ${title}`,
      'oembed:description': `Historical timeline of events related to ${title}, generated from Wikipedia content.`,
      'oembed:thumbnail_url': images[0],
      'oembed:thumbnail_width': '1200',
      'oembed:thumbnail_height': '630',
      'oembed:width': '800',
      'oembed:height': '600',
      'oembed:html': `<iframe src="${embedUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`,
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
