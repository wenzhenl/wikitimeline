"use client";

import { useState } from "react";

export default function DemoSection() {
  const [iframeError, setIframeError] = useState(false);

  return (
    <section id="demo" className="py-16 bg-white/50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8">Featured Demo</h2>
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold mb-2">
                  How WikiTimeline Works
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Watch this quick demo to see how you can create interactive
                  timelines from any Wikipedia article.
                </p>
              </div>
              <a
                href="https://www.youtube.com/watch?v=KxFrd3DOzWw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Watch on YouTube</span>
                <svg
                  className="w-4 h-4 ml-2 flex-shrink-0"
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
            <div className="relative w-full overflow-hidden pt-[56.25%]">
              {iframeError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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
                  <p className="text-gray-600 dark:text-gray-400 text-center px-4">
                    Video currently unavailable.
                    <br />
                    <a
                      href="https://www.youtube.com/watch?v=KxFrd3DOzWw"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Click here to watch on YouTube
                    </a>
                  </p>
                </div>
              ) : (
                <iframe
                  className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
                  src="https://www.youtube.com/embed/KxFrd3DOzWw?si=T7b-mDgw7GD7N-hp"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  onError={() => setIframeError(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
