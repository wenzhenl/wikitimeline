"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface NavigationHeaderProps {
  showAboutLink?: boolean;
  children?: ReactNode;
  zIndex?: string;
}

export default function NavigationHeader({
  showAboutLink = false,
  children,
  zIndex = "z-50",
}: NavigationHeaderProps) {
  return (
    <nav
      className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 ${zIndex}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex justify-between items-center h-16"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "4rem",
          }}
        >
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 py-4"
            >
              WikiTimeline
            </Link>
          </div>

          {children && (
            <div className="flex justify-between items-center w-full max-w-2xl ml-12 px-4">
              {children}
            </div>
          )}

          {showAboutLink && !children && (
            <Link
              href="/about"
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              About
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
