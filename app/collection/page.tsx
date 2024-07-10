import { PrismaClient } from "@prisma/client";
import dynamic from "next/dynamic";

const prisma = new PrismaClient();
const DynamicTimeline = dynamic(
  () => import("../components/MyTimelineComponent"),
  { ssr: false }
);

interface CollectionPageProps {
  timelineData: any[];
  error?: string;
}

async function fetchTimelines(
  pageNames: string[]
): Promise<{ timelineData: any[]; error?: string }> {
  if (!pageNames || pageNames.length === 0) {
    return {
      timelineData: [],
      error: "Invalid or missing pageNames parameter",
    };
  }

  try {
    const timelines = await Promise.all(
      pageNames.map(async (pageName) => {
        const timeline = await prisma.timeline.findUnique({
          where: { pageName_language: { pageName, language: "en" } },
        });
        return timeline ? timeline.timelineData : [];
      })
    );

    const mergedTimelineData = timelines.flat();

    return { timelineData: mergedTimelineData };
  } catch (error: any) {
    return { timelineData: [], error: error.message };
  }
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: { pageNames: string | string[] };
}) {
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
}
