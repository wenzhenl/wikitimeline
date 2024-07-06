import { PrismaClient } from "@prisma/client";
import { ParsedUrlQuery } from "querystring";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { Event } from "@/app/components/MyTimelineComponent";

const prisma = new PrismaClient();
const DynamicTimeline = dynamic(
  () => import("@/app/components/MyTimelineComponent"),
  { ssr: false }
);

interface Params extends ParsedUrlQuery {
  pageName: string;
}

interface SearchParams {
  url: string;
}

async function getTimeline(wikipediaPage: string) {
  return await prisma.timeline.findUnique({
    where: { wikipediaPage },
  });
}

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

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { pageName } = params;
  const wikipediaPage = decodeURIComponent(searchParams.url);
  const timeline = await getTimeline(wikipediaPage);

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
