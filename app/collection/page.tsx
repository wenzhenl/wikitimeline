import dynamic from "next/dynamic";

const DynamicTimeline = dynamic(
  () => import("../components/MyTimelineComponent"),
  { ssr: false }
);

interface CollectionPageProps {
  searchParams: { pageNames: string | string[] };
}

const fetchTimelines = async (
  pageNames: string[]
): Promise<{ timelineData: any[]; error?: string }> => {
  const params = new URLSearchParams();
  pageNames.forEach((name) => params.append("pageNames", name));
  const response = await fetch(
    `http://localhost:3000/api/timelines?${params.toString()}`
  );
  const data = await response.json();
  return data;
};

const CollectionPage = async ({ searchParams }: CollectionPageProps) => {
  let pageNames: string[] = [];
  if (typeof searchParams.pageNames === "string") {
    pageNames = [searchParams.pageNames];
  } else if (Array.isArray(searchParams.pageNames)) {
    pageNames = searchParams.pageNames;
  }

  const { timelineData, error } = await fetchTimelines(pageNames);

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
