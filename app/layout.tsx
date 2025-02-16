import type { Metadata } from "next";
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

export const metadata: Metadata = {
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_CONFIG.DOMAIN,
    title: "WikiTimeline - Interactive Historical Timeline Generator",
    description:
      "Transform Wikipedia articles into beautiful, interactive timelines. Compare historical events and explore history in a visual way.",
    siteName: "WikiTimeline",
  },
  twitter: {
    card: "summary_large_image",
    title: "WikiTimeline - Wikipedia Timeline Generator",
    description:
      "Create and compare interactive historical timelines from Wikipedia articles. Explore history visually.",
    images: [`${SITE_CONFIG.DOMAIN}/og.jpg`],
  },
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
