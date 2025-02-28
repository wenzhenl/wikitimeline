"use client";

import { HomeFooter } from "@/app/components/HomeFooter";
import { HomeHero } from "@/app/components/HomeHero";
import { HomeFeaturedTimelines } from "@/app/components/HomeFeaturedTimelines";
import { ClientSearchWrapper } from "@/app/components/ClientSearchWrapper";
import NavigationHeader from "@/app/components/NavigationHeader";

export default function HomePage() {
  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <NavigationHeader showAboutLink={true} />

      <main
        className="flex-grow flex flex-col"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: "1 0 auto",
          paddingBottom: "2rem",
        }}
      >
        <div
          className="text-center w-full max-w-4xl mx-auto px-4"
          style={{
            textAlign: "center",
            width: "100%",
            maxWidth: "56rem",
            marginLeft: "auto",
            marginRight: "auto",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        >
          <HomeHero />
          <ClientSearchWrapper />
          <HomeFeaturedTimelines />
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
