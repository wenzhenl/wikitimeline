import { SITE_CONFIG } from "@/app/config/site";
import { PAGE_DELIMITER } from "@/app/constants";
export async function generateMetadata({
  params,
}: {
  params: { pageName: string };
}) {
  const pageNames = decodeURIComponent(params.pageName)
    .split(PAGE_DELIMITER)
    .map((name) => name.trim())
    .filter(Boolean);

  const title = pageNames
    .map((name) => decodeURIComponent(name).replace(/_/g, " "))
    .join(PAGE_DELIMITER);

  const url = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;

  const previewImageUrl = `${SITE_CONFIG.DOMAIN}/preview.jpg`;

  return {
    title: `Historical Timeline of ${title} - Chronological Events & History`,
    description: `Explore the complete historical timeline of ${title}. A comprehensive chronological overview of key events, dates, and milestones throughout history, sourced from Wikipedia. Interactive visualization of historical data.`,
    keywords: `${title} history, ${title} timeline, historical events, chronology, ${title} chronological order, historical dates, ${title} key events, historical milestones`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`,
    },
    openGraph: {
      title: `Historical Timeline of ${title} - Chronological Events & History`,
      description: `Explore the complete historical timeline of ${title}. A comprehensive chronological overview of key events, dates, and milestones throughout history.`,
      images: [
        {
          url: previewImageUrl,
          width: 1200,
          height: 630,
          alt: `Timeline of ${title}`,
        },
      ],
      type: "article",
      url: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Historical Timeline of ${title} - Chronological Events`,
      description: `Comprehensive historical timeline showing key events and dates throughout the history of ${title}.`,
      image: previewImageUrl,
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
