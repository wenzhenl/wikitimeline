import { SITE_CONFIG } from "@/app/config/site";

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

  const url = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;

  const previewImageUrl = `${SITE_CONFIG.DOMAIN}/preview.png`;

  return {
    title: `Timeline of ${title}`,
    description: `Timeline related to ${title}, generated from Wikipedia content.`,
    openGraph: {
      title: `Timeline of ${title}`,
      description: `Timeline related to ${title}, generated from Wikipedia content.`,
      images: [
        {
          url: previewImageUrl,
          width: 1200,
          height: 630,
          alt: `Timeline of ${title}`,
        },
      ],
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `Timeline of ${title}`,
      description: `Timeline related to ${title}, generated from Wikipedia content.`,
      images: [previewImageUrl],
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
