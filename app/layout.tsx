import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { SITE_CONFIG } from "./config/site";

export const metadata: Metadata = {
  title: "WikiTimeline",
  description: "Generate Timeline From Wikipedia",
};

export default function RootLayout({
  children, 
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics gaId={SITE_CONFIG.GOOGLE_ANALYTICS_ID ?? ''  } />
      </body>
    </html>
  );
}
