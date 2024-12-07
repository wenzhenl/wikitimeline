"use client";

import { useEffect, useState } from "react";
import MyTimelineComponent from "../../components/MyTimelineComponent";

interface TimelineEvent {
  date: string;
  text: string;
}

export default function TimelinePage({
  params,
}: {
  params: { pageName: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/wikipedia/${params.pageName}`);
        if (!response.ok) {
          throw new Error("Failed to fetch timeline data");
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setEvents(data.timeline);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [params.pageName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
          Generating Timeline...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Please wait while we analyze the Wikipedia content
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Timeline: {decodeURIComponent(params.pageName).replace(/_/g, " ")}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <MyTimelineComponent
            events={events.map((event) => {
              const [year, month, day] = event.date.split("-").map(Number);
              return {
                start_date: { year, month, day },
                text: { headline: event.text },
              };
            })}
          />
        </div>
      </div>
    </div>
  );
}
