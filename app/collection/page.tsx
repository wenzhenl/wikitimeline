"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Loading from "../components/Loading";

const DynamicTimeline = dynamic(
  () => import("../components/MyTimelineComponent"),
  { ssr: false }
);

const CollectionPage = () => {
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchTimelines = async () => {
      const pageNames = searchParams.getAll("pageNames");
      if (!pageNames || pageNames.length === 0) {
        setError("Invalid or missing pageNames parameter");
        setLoading(false);
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        pageNames.forEach((name) => queryParams.append("pageNames", name));

        const response = await fetch(
          `/api/timelines?${queryParams.toString()}`
        );
        const data = await response.json();
        if (response.ok) {
          setTimelineData(data.timelineData);
        } else {
          setError(data.error || "Failed to fetch timelines");
        }
      } catch (err) {
        setError("Failed to fetch timelines");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelines();
  }, [searchParams]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p>{error}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700">
          Go back to homepage
        </a>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
        Merged Timeline
      </h1>
      <DynamicTimeline events={timelineData} />
      <a
        href="/"
        className="text-lg text-blue-500 hover:text-blue-700 mt-4 block"
      >
        Go back to homepage
      </a>
    </div>
  );
};

export default CollectionPage;
