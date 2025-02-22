"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PAGE_DELIMITER } from "@/app/constants";
import { HomeFooter } from "@/app/components/HomeFooter";
import { HomeHero } from "@/app/components/HomeHero";
import { HomeFeatures } from "@/app/components/HomeFeatures";
import { HomeFeaturedTimelines } from "@/app/components/HomeFeaturedTimelines";
import { ClientSearchWrapper } from "@/app/components/ClientSearchWrapper";
import { HomeNavigation } from "@/app/components/HomeNavigation";

interface SelectedPage {
  title: string;
  link: string;
}

export default function HomePage() {
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (selectedPages.length === 0) {
      setError("Please select at least one Wikipedia page.");
      return;
    }

    setError("");

    // Get all page names and encode them
    const pageNames = selectedPages
      .map((page) => {
        const titleFromUrl = page.link.split("/wiki/").pop();
        if (titleFromUrl) {
          const cleanTitle = decodeURIComponent(
            titleFromUrl.split("#")[0].split("?")[0]
          );
          return encodeURIComponent(cleanTitle);
        }
        return null;
      })
      .filter(Boolean);

    if (!pageNames.length) {
      setError("Invalid Wikipedia URL or title");
      return;
    }

    // Join with encoded delimiter and redirect
    router.push(
      `/timeline/${pageNames.join(encodeURIComponent(PAGE_DELIMITER))}`
    );
  };

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
