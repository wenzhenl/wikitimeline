import { PrismaClient, Timeline } from "@prisma/client";
import { GetServerSideProps } from "next";
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

export const getServerSideProps: GetServerSideProps<
  CollectionPageProps
> = async (context) => {
  const { query } = context;
  const pageNames = query.pageNames;

  if (!pageNames || !Array.isArray(pageNames)) {
    return {
      props: {
        timelineData: [],
        error: "Invalid or missing pageNames parameter",
      },
    };
  }

  try {
    const timelines = await Promise.all(
      pageNames.map(async (pageName) => {
        const timeline = await prisma.timeline.findUnique({
          where: {
            pageName_language: { pageName: pageName as string, language: "en" },
          },
        });
        return timeline ? timeline.timelineData : [];
      })
    );

    const mergedTimelineData = timelines.flat();

    return {
      props: { timelineData: mergedTimelineData },
    };
  } catch (error: any) {
    return {
      props: { timelineData: [], error: error.message },
    };
  }
};

const CollectionPage = ({ timelineData, error }: CollectionPageProps) => {
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
