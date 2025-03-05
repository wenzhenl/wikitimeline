import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "@/app/globals.css";
import { SITE_CONFIG } from "@/app/config/site";

// Initialize font at module scope
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter", // Add variable support for Tailwind
});

export function generateMetadata() {
  const url = SITE_CONFIG.DOMAIN;
  const previewImageUrl = `${SITE_CONFIG.DOMAIN}/preview.png`;

  return {
    title: {
      default:
        "WikiTimeline - Generate Interactive Historical Timelines from Wikipedia",
      template: `%s | WikiTimeline`,
    },
    description:
      "Transform Wikipedia articles into beautiful, interactive timelines. Compare historical events, explore connections, and discover history in a new way. Free, open-source timeline visualization tool.",
    keywords: [
      "Wikipedia Timeline",
      "Historical Timeline Generator",
      "Interactive Timeline",
      "History Visualization",
      "Timeline Comparison",
      "Wikipedia Visualization",
      "Historical Events",
      "Timeline Tool",
      "History Explorer",
      "Wikipedia Tool",
    ],
    metadataBase: new URL(url),
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png" },
        { url: "/apple-touch-icon-57x57.png", sizes: "57x57" },
        { url: "/apple-touch-icon-60x60.png", sizes: "60x60" },
        { url: "/apple-touch-icon-72x72.png", sizes: "72x72" },
        { url: "/apple-touch-icon-76x76.png", sizes: "76x76" },
        { url: "/apple-touch-icon-114x114.png", sizes: "114x114" },
        { url: "/apple-touch-icon-120x120.png", sizes: "120x120" },
        { url: "/apple-touch-icon-144x144.png", sizes: "144x144" },
        { url: "/apple-touch-icon-152x152.png", sizes: "152x152" },
        { url: "/apple-touch-icon-180x180.png", sizes: "180x180" },
      ],
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: SITE_CONFIG.DOMAIN,
      title: "WikiTimeline - Interactive Historical Timeline Generator",
      description:
        "Transform Wikipedia articles into beautiful, interactive timelines. Compare historical events and explore history in a visual way.",
      siteName: "WikiTimeline",
      images: [
        {
          url: previewImageUrl,
          width: 1200,
          height: 630,
          alt: "WikiTimeline - Interactive Historical Timeline Generator",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "WikiTimeline - Wikipedia Timeline Generator",
      description:
        "Create and compare interactive historical timelines from Wikipedia articles. Explore history visually.",
      image: previewImageUrl,
    },
  };
}

// Add a separate viewport export
export const viewport: Viewport = {
  themeColor: "#34495e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        {SITE_CONFIG.GOOGLE_ANALYTICS_ID && (
          <GoogleAnalytics gaId={SITE_CONFIG.GOOGLE_ANALYTICS_ID} />
        )}
        {SITE_CONFIG.ADSENSE_CLIENT_ID ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE_CONFIG.ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          ></script>
        ) : null}
      </body>
    </html>
  );
}
