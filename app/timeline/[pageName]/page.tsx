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

const TimelinePage = ({ params }) => {
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

  return (
    <div>
      <h1>Timeline for {params.pageName}</h1>
      <DynamicTimeline events={timeline.timelineData} />
      <a href="/">Go back to homepage</a>
    </div>
  );
};

export default TimelinePage;
