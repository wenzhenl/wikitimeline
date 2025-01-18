"use client";

import { useState } from "react";

export default function DemoSection() {
  const [iframeError, setIframeError] = useState(false);

  return (
    <section id="demo" className="py-16 bg-white/50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8">Featured Timelines</h2>
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold mb-2">
                  Founding Fathers of America
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Explore the lives and achievements of America&apos;s founding
                  fathers in an interactive timeline.
                </p>
              </div>
              <a
                href="/timeline/George_Washington,Thomas_Jefferson,John_Adams,Benjamin_Franklin,Alexander_Hamilton,John_Jay,James_Madison"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Open in new tab</span>
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
            <div className="mt-4 aspect-[16/9] relative">
              {iframeError ? (
                <div className="flex flex-col items-center justify-center h-[600px] bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <svg
                    className="w-12 h-12 text-gray-400 mb-4"
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
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    Preview currently unavailable.
                    <br />
                    <a
                      href="/timeline/George_Washington,Thomas_Jefferson,John_Adams,Benjamin_Franklin,Alexander_Hamilton,John_Jay,James_Madison"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Click here to view the timeline in a new tab
                    </a>
                  </p>
                </div>
              ) : (
                <iframe
                  src="/timeline/George_Washington,Thomas_Jefferson,John_Adams,Benjamin_Franklin,Alexander_Hamilton,John_Jay,James_Madison/embed"
                  width="100%"
                  height="600"
                  frameBorder="0"
                  allow="fullscreen"
                  className="rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={() => setIframeError(true)}
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (!iframe.contentWindow) {
                      setIframeError(true);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
