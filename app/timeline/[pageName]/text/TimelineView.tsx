"use client";

import { useRef } from "react";
import html2canvas from "html2canvas";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TimelineViewProps {
  data: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  };
  pageName: string;
}

export default function TimelineView({ data, pageName }: TimelineViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!timelineRef.current) return;

    try {
      const canvas = await html2canvas(timelineRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${pageName}-timeline.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      console.error("Failed to generate image:", error);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        className="mb-8 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Save as Image
      </button>

      <div
        ref={timelineRef}
        className="relative bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 rounded-lg"
      >
        <div className="absolute left-[19px] top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500"></div>
        <div className="space-y-12">
          {data.timeline.map((event, index) => {
            const isNegativeYear = event.date.startsWith("-");
            const normalizedDate = isNegativeYear
              ? event.date.slice(1)
              : event.date;
            const dateParts = normalizedDate.split("-");
            const year = parseInt(dateParts[0]);

            const colors = [
              "from-blue-500 to-purple-500",
              "from-purple-500 to-pink-500",
              "from-green-500 to-teal-500",
            ];
            const gradientColor = colors[index % colors.length];

            return (
              <div key={index} className="relative flex items-start gap-6">
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-r ${gradientColor} flex items-center justify-center shadow-lg`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-800"></div>
                  </div>
                </div>

                <div className="flex-1 w-full md:min-w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 transition-all hover:shadow-lg">
                  <time className="gradient-text text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 mb-3 block">
                    {year} {isNegativeYear ? "BC" : ""}
                    {dateParts[1] &&
                      ` ${new Date(
                        2000,
                        parseInt(dateParts[1]) - 1
                      ).toLocaleString("default", { month: "long" })}`}
                    {dateParts[2] && ` ${parseInt(dateParts[2])}`}
                  </time>

                  <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                    {event.headline}
                  </h2>

                  {event.text && (
                    <p className="text-base text-gray-700 dark:text-gray-200">
                      {event.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {data.errors?.failedPages && data.errors.failedPages.length > 0 && (
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded">
            <p className="text-yellow-800 dark:text-yellow-200">
              Note: Could not include data from:{" "}
              {data.errors.failedPages.join(", ")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
