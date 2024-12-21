export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          About WikiTimeline
        </h1>

        <div className="space-y-8 text-gray-600 dark:text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              What is WikiTimeline?
            </h2>
            <p className="text-lg">
              WikiTimeline transforms Wikipedia articles into interactive
              timelines, making it easier to visualize and explore historical
              events. Perfect for students, researchers, and history enthusiasts
              who want to better understand the chronological flow of events.
            </p>
          </section>

          <section className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-yellow-800 dark:text-yellow-200">
              Important Disclaimer
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300">
              The timelines generated are automated summaries and may not always
              be completely accurate or up to date. Please refer to the original
              Wikipedia articles for the most accurate and current information.
              Our tool is meant to be a visual aid and should not be used as the
              sole source of information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              How It Works
            </h2>
            <p className="text-lg">
              Our system analyzes Wikipedia articles to extract dates and
              events, organizing them into an interactive timeline. You can
              compare multiple articles side by side, zoom in on specific
              periods, and explore events in detail.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Contact Us
            </h2>
            <p className="text-lg">
              Have questions, suggestions, or found an issue? We'd love to hear
              from you! Contact us at:{" "}
              <a
                href="mailto:wikitimeline2024@gmail.com"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                wikitimeline2024@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
