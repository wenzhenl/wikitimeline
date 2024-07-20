import dynamic from "next/dynamic";
import { BASE_URL } from "@/config";

const DynamicTimeline = dynamic(
  () => import("@/app/components/MyTimelineComponent"),
  { ssr: false }
);

const DynamicSaveButton = dynamic(() => import("@/app/components/SaveButton"), {
  ssr: false,
});

interface CollectionPageProps {
  searchParams: { pageNames: string | string[] };
}

const fetchTimeline = async (
  pageName: string
): Promise<{ timelineData: any[]; error?: string }> => {
  const response = await fetch(`${BASE_URL}/api/timeline?pageName=${pageName}`);
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

  const timelines = await Promise.all(
    pageNames.map((pageName) => fetchTimeline(pageName))
  );

  const timelineData = timelines.flatMap(({ timelineData }) => timelineData);

  const error = timelines.find(({ error }) => error)?.error;

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
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extralight text-red-900 dark:text-gray-100 mb-8">
          Timeline for{" "}
          {pageNames.map((name) => name.replace(/_/g, " ")).join(" | ")}
        </h1>
        <DynamicSaveButton pageNames={pageNames} />
      </div>
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
