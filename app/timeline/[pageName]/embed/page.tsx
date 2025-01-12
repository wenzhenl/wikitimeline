import EmbeddedTimeline from "@/app/components/EmbeddedTimeline";
import { SITE_CONFIG } from "@/app/config/site";

async function getTimelineData(pageName: string) {
  try {
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/wikipedia/${pageName}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch timeline data");
    }

    const data = await response.json();
    return data.timeline || [];
  } catch (error) {
    console.error(`Failed to fetch timeline data for ${pageName}:`, error);
    return [];
  }
}

export default async function EmbedPage({
  params,
}: {
  params: { pageName: string };
}) {
  const events = await getTimelineData(params.pageName);
  return <EmbeddedTimeline events={events} />;
}

export function generateMetadata({ params }: { params: { pageName: string } }) {
  const pageNames = decodeURIComponent(params.pageName)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const title = pageNames
    .map((name) => decodeURIComponent(name).replace(/_/g, " "))
    .join(", ");

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
