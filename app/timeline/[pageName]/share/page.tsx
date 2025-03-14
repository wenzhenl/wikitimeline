"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { isMobile, isTablet } from "@/app/utils/deviceDetection";
import { ERROR_MESSAGES } from "@/app/constants/errorMessages";

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

// Error component for when redirection fails
function ErrorComponent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-16 h-16 text-red-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Redirection Failed
      </h2>
      <p className="text-gray-600 dark:text-gray-300 text-center max-w-md mb-6">
        {ERROR_MESSAGES.UNKNOWN_ERROR}
      </p>
      <a
        href="/"
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Return to Home
      </a>
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
  const [redirectError, setRedirectError] = useState(false);

  useEffect(() => {
    try {
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
    } catch (error) {
      console.error("Error during redirection:", error);
      setRedirectError(true);
    }
  }, [params.pageName, router, searchParams]);

  // Show error state if redirection failed
  if (redirectError) {
    return <ErrorComponent />;
  }

  // Show loading state while redirecting
  return <LoadingRedirect />;
}
