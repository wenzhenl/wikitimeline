"use client";

import { SITE_CONFIG } from "@/app/config/site";

interface ReportIssueButtonProps {
  pageName: string;
  isMobile?: boolean;
  onMobileClick?: () => void;
}

export default function ReportIssueButton({
  pageName,
  isMobile = false,
  onMobileClick,
}: ReportIssueButtonProps) {
  const handleReportIssue = () => {
    const pageNames = decodeURIComponent(pageName).replace(/_/g, " ");
    const timelineUrl = `${SITE_CONFIG.DOMAIN}/timeline/${pageName}`;
    const subject = encodeURIComponent(`Timeline Issue: ${pageNames}`);
    const body = encodeURIComponent(
      `I found an issue with the timeline for: ${pageNames}\n\n` +
        `Timeline URL: ${timelineUrl}\n\n` +
        `Issue description:\n`
    );

    window.location.href = `mailto:${SITE_CONFIG.CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    // If this is a mobile button and we have a callback, call it
    if (isMobile && onMobileClick) {
      onMobileClick();
    }
  };

  // Mobile version
  if (isMobile) {
    return (
      <button
        onClick={handleReportIssue}
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Report Issue
      </button>
    );
  }

  // Desktop version
  return (
    <button
      onClick={handleReportIssue}
      className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg whitespace-nowrap"
    >
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      Report Issue
    </button>
  );
}
