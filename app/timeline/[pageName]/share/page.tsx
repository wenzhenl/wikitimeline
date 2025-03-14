"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { isMobile, isTablet } from "@/app/utils/deviceDetection";

// Simple loading component while redirection happens
function LoadingRedirect() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-16 h-16 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Redirecting to the best experience for your device...
      </p>
    </div>
  );
}

export default function SharePage({
  params,
}: {
  params: { pageName: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get any existing query parameters to preserve them
    const existingParams = new URLSearchParams(searchParams.toString());

    // Force specific view if requested via query param
    const forceView = searchParams.get("view");

    if (forceView === "interactive") {
      router.replace(
        `/timeline/${params.pageName}?${existingParams.toString()}`
      );
      return;
    }

    if (forceView === "text") {
      // Assuming you have a text version route
      router.replace(
        `/timeline/${params.pageName}/text?${existingParams.toString()}`
      );
      return;
    }

    // Auto-detect based on device using the utility functions
    if (isMobile()) {
      // Redirect to text version for mobile and tablet devices
      router.replace(
        `/timeline/${params.pageName}/text?${existingParams.toString()}`
      );
    } else {
      // Redirect to interactive version for desktop
      router.replace(
        `/timeline/${params.pageName}?${existingParams.toString()}`
      );
    }
  }, [params.pageName, router, searchParams]);

  // Show loading state while redirecting
  return <LoadingRedirect />;
}
