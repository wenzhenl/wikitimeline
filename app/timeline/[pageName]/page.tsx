import dynamic from "next/dynamic";
import { BASE_URL } from "@/config";

const DynamicTimeline = dynamic(
  () => import("@/app/components/MyTimelineComponent"),
  { ssr: false }
);

interface PageProps {
  params: { pageName: string };
}

const fetchTimeline = async (
  pageName: string
): Promise<{ timelineData: any[]; error?: string }> => {
  const response = await fetch(`${BASE_URL}/api/timeline?pageName=${pageName}`);
  const data = await response.json();
  return data;
};

const TimelinePage = async ({ params }: PageProps) => {
  const { pageName } = params;

  const { timelineData, error } = await fetchTimeline(pageName);

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
      <h1 className="text-4xl font-extralight text-red-900 dark:text-red-400 mb-8">
        Timeline for {pageName.replace(/_/g, " ")}
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

export default TimelinePage;
