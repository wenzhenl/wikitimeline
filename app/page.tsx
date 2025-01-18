"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import WikiSearch from "./components/WikiSearch";
import Link from "next/link";

interface SelectedPage {
  title: string;
  link: string;
}

export default function HomePage() {
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (selectedPages.length === 0) {
      setError("Please select at least one Wikipedia page.");
      return;
    }

    setLoading(true);
    setError("");

    // Get all page names
    const pageNames = selectedPages
      .map((page) => {
        // Handle both title and URL formats
        const titleFromUrl = page.link.split("/wiki/").pop();
        if (titleFromUrl) {
          // Remove any hash or query parameters and decode
          return decodeURIComponent(titleFromUrl.split("#")[0].split("?")[0]);
        }
        return null;
      })
      .filter(Boolean);

    if (!pageNames.length) {
      setError("Invalid Wikipedia URL or title");
      setLoading(false);
      return;
    }

    // Join all page names with commas and redirect to timeline page
    router.push(`/timeline/${pageNames.join(",")}`);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 py-4"
              >
                WikiTimeline
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => scrollToSection("demo")}
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Demo
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("signin")}
                className="flex items-center px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg"
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
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Sign In
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      isMenuOpen
                        ? "M6 18L18 6M6 6l12 12"
                        : "M4 6h16M4 12h16M4 18h16"
                    }
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => scrollToSection("demo")}
                className="flex items-center w-full px-3 py-2 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
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
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Demo
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="flex items-center w-full px-3 py-2 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("signin")}
                className="flex items-center w-full px-3 py-2 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
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
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Sign In
              </button>
            </div>
          </div>
        )}
      </nav>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
            Loading...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please wait while we fetch and process the Wikipedia page.
          </p>
        </div>
      ) : (
        <main>
          <div className="text-center w-full max-w-4xl mx-auto py-16 px-4">
            <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
              Transform Wikipedia into Interactive Timelines
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Instantly convert any Wikipedia article into a beautiful,
              interactive timeline. Perfect for students, researchers, and
              history enthusiasts.
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <WikiSearch
                  selectedPages={selectedPages}
                  onPagesChange={setSelectedPages}
                  onSubmit={handleSubmit}
                  placeholder="Search or paste Wikipedia URLs (e.g. 'Albert Einstein' or 'wikipedia.org/wiki/World_War_II')..."
                  className="flex-1"
                />
                <button
                  type="submit"
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Generate Timeline
                </button>
              </form>
              {error && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  Instant Generation
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Convert any Wikipedia article into a timeline in seconds
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  Multiple Pages
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Compare multiple timelines side by side
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  Interactive View
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Zoom, scroll, and explore events interactively
                </p>
              </div>
            </div>
          </div>

          {/* Demo Section */}
          <section id="demo" className="py-16 bg-white/50 dark:bg-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold mb-8">Featured Timelines</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/timeline/George_Washington,Thomas_Jefferson,John_Adams,Benjamin_Franklin,Alexander_Hamilton,John_Jay,James_Madison"
                  className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <h3 className="text-xl font-bold mb-2">
                    Founding Fathers of America
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Explore the lives and achievements of America's founding
                    fathers in an interactive timeline.
                  </p>
                </Link>
                {/* Add more example timelines here */}
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold mb-8">Pricing</h2>
              {/* Add pricing content */}
            </div>
          </section>

          {/* Sign In Section */}
          <section
            id="signin"
            className="py-16 bg-white/50 dark:bg-gray-800/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold mb-8">Sign In</h2>
              {/* Add sign in content */}
            </div>
          </section>
        </main>
      )}

      <footer className="py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            <p className="mb-2">© 2024 WikiTimeline. All rights reserved.</p>
            <div className="flex justify-center items-center space-x-4">
              <Link
                href="/about"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                About
              </Link>
              <p className="text-xs">
                Featured in:{" "}
                <a
                  href="https://iuu.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  IUU AI
                </a>{" "}
                and{" "}
                <a
                  href="https://magicbox.tools/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="MagicBox.Tools - AI Tools Directory"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  MagicBox.Tools
                </a>{" "}
                and{" "}
                <a
                  href="https://allinai.tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="The Best AI Tools"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  All in AI Tools
                </a>{" "}
                and{" "}
                <a
                  href="https://www.dir2ai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Dir2AI Tools Directory"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Dir2AI
                </a>{" "}
                and{" "}
                <a
                  href="https://aijustworks.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="AI Just Works"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  AI Just Works
                </a>{" "}
                and{" "}
                <a
                  href="https://SeekAIs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="SeekAIs"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  SeekAIs
                </a>{" "}
                and{" "}
                <a
                  href="https://AIToolly.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="AIToolly AI Tools Directory"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  AIToolly
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
