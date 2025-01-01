"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TimelineView from "./TimelineView";
import html2canvas from "html2canvas";
import { deviceDetection } from "@/app/utils/deviceDetection";
import { SITE_CONFIG } from "@/app/config/site";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TimelinePageContentProps {
  params: { pageName: string };
  searchParams: { active?: string };
  initialData: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  };
}

const ShareDialog = ({
  isOpen,
  onClose,
  pageName,
  imageBlob,
}: {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
  imageBlob: Blob | null;
}) => {
  const isMobile = deviceDetection.isMobile();
  const hasShareApi = deviceDetection.hasShareApi();

  const pageUrl = `${SITE_CONFIG.DOMAIN}/timeline/${pageName}/text`;
  const shareText = `🚀 Explore the history of ${decodeURIComponent(pageName)
    .replace(/_/g, " ")
    .replace(
      /,/g,
      ", "
    )} through this interactive timeline! 📚 Powered by wiki-timeline.com - Turn Wikipedia pages into beautiful, interactive timelines ⚡️`;

  const handleShare = async () => {
    try {
      if (isMobile && hasShareApi && imageBlob) {
        const file = new File([imageBlob], "timeline.png", {
          type: "image/png",
        });
        await navigator.share({
          title: `Timeline of ${decodeURIComponent(pageName).replace(
            /_/g,
            " "
          )}`,
          text: shareText,
          files: [file],
        });
      } else if (imageBlob) {
        // Desktop: download file
        const url = URL.createObjectURL(imageBlob);
        const link = document.createElement("a");
        link.download = `${pageName}-timeline.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    } finally {
      onClose(); // Always close the dialog, even if sharing was cancelled
    }
  };

  // For mobile, trigger share immediately when dialog opens
  useEffect(() => {
    if (isOpen && isMobile && hasShareApi) {
      handleShare();
    }
  }, [isOpen]);

  // Don't render modal for mobile devices
  if (isMobile && hasShareApi) {
    return null;
  }

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full relative z-[10000]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Share Timeline</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* X (Twitter) */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              shareText
            )}&url=${encodeURIComponent(pageUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-sm">X</span>
          </a>

          {/* Reddit */}
          <a
            href={`https://www.reddit.com/submit?url=${encodeURIComponent(
              pageUrl
            )}&title=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-[#FF4500] text-white rounded-lg hover:bg-[#e03d00]"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            <span className="text-sm">Reddit</span>
          </a>

          {/* LinkedIn */}
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
              pageUrl
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-[#0077b5] text-white rounded-lg hover:bg-[#006399]"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <span className="text-sm">LinkedIn</span>
          </a>

          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(
              pageUrl
            )}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b3]"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.178.119.13.154.305.164.43-.001.097-.015.185-.049.336z" />
            </svg>
            <span className="text-sm">Telegram</span>
          </a>
        </div>

        <div className="border-t dark:border-gray-700 pt-4">
          <button
            onClick={handleShare}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
          >
            Download as Image
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default function TimelinePageContent({
  params,
  searchParams,
  initialData,
}: TimelinePageContentProps) {
  const [showShare, setShowShare] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const isMobile = deviceDetection.isMobile();
  const hasShareApi = deviceDetection.hasShareApi();

  const handleShare = async () => {
    try {
      const timelineElement = document.querySelector("#timeline-content");
      if (!timelineElement) return;

      const canvas = await html2canvas(timelineElement as HTMLElement, {
        backgroundColor: null,
        scale: 2,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        setImageBlob(blob);
        setShowShare(true);
      }, "image/png");
    } catch (error) {
      console.error("Failed to generate image:", error);
    }
  };

  // Split and decode the pageNames
  const pageNames = decodeURIComponent(params.pageName)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  // Use the active param or first page
  const activePage = searchParams.active || pageNames[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
            >
              WikiTimeline
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={`/timeline/${params.pageName}`}
                className="text-blue-600 hover:text-blue-800"
              >
                Interactive View
              </Link>
              <button
                onClick={handleShare}
                className="text-blue-600 hover:text-blue-800"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8 pt-24" id="timeline-content">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {decodeURIComponent(activePage).replace(/_/g, " ")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Timeline events</p>
        </div>

        {pageNames.length > 1 && (
          <Tabs pageNames={pageNames} currentPage={activePage} />
        )}

        <div className="mt-8">
          <TimelineView data={initialData} />
        </div>
      </main>

      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        pageName={params.pageName}
        imageBlob={imageBlob}
      />
    </div>
  );
}

function Tabs({
  pageNames,
  currentPage,
}: {
  pageNames: string[];
  currentPage: string;
}) {
  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="-mb-px flex flex-wrap gap-4" aria-label="Tabs">
        {pageNames.map((pageName) => {
          const isActive = pageName === currentPage;
          return (
            <Link
              key={pageName}
              href={`/timeline/${encodeURIComponent(
                pageNames.join(",")
              )}/text?active=${encodeURIComponent(pageName)}`}
              className={`
                py-2 px-3 rounded-lg font-medium text-sm transition-colors
                ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              {pageName.replace(/_/g, " ")}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
