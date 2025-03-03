"use client";

import Link from "next/link";

function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
    >
      Try again
    </button>
  );
}

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header - Matching homepage style */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
            >
              WikiTimeline
            </Link>
          </div>
        </div>
      </nav>

      {/* Error Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Something went wrong
          </h1>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            We encountered an error while generating your timeline. Please try
            again.
          </p>
          <div className="flex gap-4 justify-center">
            <RetryButton />
            <Link
              href="/"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
