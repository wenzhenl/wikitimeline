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
  title: "WikiTimeline",
  description: "Generate Timeline From Wikipedia",
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
