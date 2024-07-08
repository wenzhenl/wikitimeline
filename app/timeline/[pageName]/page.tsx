import { PrismaClient } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { Event } from "@/app/components/MyTimelineComponent";
import Loading from "@/app/components/Loading";
import wiki from "wikipedia";
import OpenAI from "openai";

const openai = new OpenAI();
const prisma = new PrismaClient();
const DynamicTimeline = dynamic(
  () => import("@/app/components/MyTimelineComponent"),
  { ssr: false, loading: () => <Loading /> }
);

interface PageProps {
  params: { pageName: string };
}

interface SearchParams {
  url: string;
}

const extractWikiPage = async (pageName: string) => {
  try {
    const wikiPage = await wiki.content(pageName);
    console.log(wikiPage);
    return wikiPage;
  } catch (error) {
    console.log(error);
  }
};

const summarizeWiki2Timeline = async (wikiPage: string, pageName: string) => {
  const prompt = `
You are a world-class expert in summarizing Wikipedia pages into timelines and outputting them in JSON format. Please read carefully the content I passed and list out the most important events of ${pageName}, not exceeding 30 events. Output this as a JSON with a list of events, where each event follows the following format:

Event {
  start_date: { year: number; month?: number; day?: number };
  text: { headline: string; text: string };
  group?: string;
}

Ensure that the headline is a concise summary of the event in less than 10 words, and the text provides detailed information. The group should always be ${pageName}.
  `;

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: prompt,
      },
      { role: "user", content: wikiPage },
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });
  console.log(completion.choices[0].message.content);

  if (completion.choices.length === 0) {
    throw new Error("Failed to fetch summary from OpenAI");
  }

  const content = completion.choices[0].message.content;

  if (!content) return JSON.parse("{}");
  // Assuming the content is wrapped in an object with an "events" property, we parse it and extract the events array
  const parsedContent = JSON.parse(content);
  const events = parsedContent.events || parsedContent;

  return events;
};

const getTimeline = async (pageName: string) => {
  const language = "en";
  const timeline = await prisma.timeline.findUnique({
    where: { pageName_language: { pageName: pageName, language: language } },
  });

  if (!timeline) {
    const wikiPage = await extractWikiPage(pageName);
    if (!wikiPage) return timeline;
    const summary = await summarizeWiki2Timeline(wikiPage, pageName);
    if (!summary) return timeline;

    const newTimeline = await prisma.timeline.create({
      data: {
        pageName,
        language,
        wikipediaPage: `https://${language}.wikipedia.org/wiki/${pageName}`,
        timelineData: summary,
      },
    });
    return newTimeline;
  }
  return timeline;
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
  const { pageName } = params;
  const timeline = await getTimeline(pageName);

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
