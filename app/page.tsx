"use client";

import { HomeFooter } from "@/app/components/HomeFooter";
import { HomeHero } from "@/app/components/HomeHero";
import { HomeFeatures } from "@/app/components/HomeFeatures";
import { HomeFeaturedTimelines } from "@/app/components/HomeFeaturedTimelines";
import { ClientSearchWrapper } from "@/app/components/ClientSearchWrapper";
import { HomeNavigation } from "@/app/components/HomeNavigation";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <HomeNavigation />
      <main className="flex-grow">
        <div className="text-center w-full max-w-4xl mx-auto py-16 px-4">
          <HomeHero />
          <ClientSearchWrapper />
          <HomeFeatures />
        </div>

        <HomeFeaturedTimelines />
      </main>
      <HomeFooter />
    </div>
  );
}
