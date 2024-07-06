import { PrismaClient } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { Event } from "@/app/components/MyTimelineComponent";

const prisma = new PrismaClient();
const DynamicTimeline = dynamic(
  () => import("@/app/components/MyTimelineComponent"),
  { ssr: false }
);

interface PageProps {
  params: { lang: string; pageName: string };
}

interface SearchParams {
  url: string;
}

const getTimeline = async (pageName: string, language: string) => {
  return await prisma.timeline.findUnique({
    where: { pageName_language: { pageName: pageName, language: language } },
  });
};

const isEventArray = (data: any): data is Event[] => {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item.start_date === "object" &&
      typeof item.start_date.year === "number" &&
      typeof item.text === "object" &&
      typeof item.text.headline === "string"
  );
};

export default async function TimelinePage({ params }: PageProps) {
  const { pageName, lang } = params;
  const timeline = await getTimeline(pageName, lang);

  if (!timeline || !isEventArray(timeline.timelineData)) {
    return (
      <div>
        <h1>Timeline Not Found</h1>
        <p>
          The timeline for <strong>{pageName}</strong> has not been created.
        </p>
        <a href="/">Go back to homepage</a>
      </div>
    );
  }

  const events: Event[] = isEventArray(timeline.timelineData)
    ? timeline.timelineData
    : [];
  return (
    <div>
      <h1>Timeline for {pageName}</h1>
      <DynamicTimeline events={events} />
      <a href="/">Go back to homepage</a>
    </div>
  );
}
