import { PrismaClient } from "@prisma/client";
import { use } from "react";
import dynamic from "next/dynamic";
import { Event } from "@/app/components/MyTimelineComponent";

const DynamicTimeline = dynamic(
  () => import("@/app/components/MyTimelineComponent"),
  { ssr: false }
);

const prisma = new PrismaClient();

async function getTimeline(pageName: string) {
  const wikipediaPage = `https://en.wikipedia.org/wiki/${pageName}`;
  return await prisma.timeline.findUnique({
    where: { wikipediaPage },
  });
}

interface Params {
  pageName: string;
}

const isEventArray = (data: any): data is Event[] => {
  if (!Array.isArray(data)) return false;
  return data.every((item) => {
    return (
      typeof item.start_date === "object" &&
      typeof item.start_date.year === "number" &&
      typeof item.text === "object" &&
      typeof item.text.headline === "string"
    );
  });
};

const TimelinePage = ({ params }: { params: Params }) => {
  const timeline = use(getTimeline(params.pageName));

  if (!timeline) {
    return (
      <div>
        <h1>Timeline Not Found</h1>
        <p>
          The timeline for <strong>{params.pageName}</strong> has not been
          created.
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
      <h1>Timeline for {params.pageName}</h1>
      <DynamicTimeline events={events} />
      <a href="/">Go back to homepage</a>
    </div>
  );
};

export default TimelinePage;
