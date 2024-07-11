import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageNames = searchParams.getAll('pageNames');

  if (!pageNames || pageNames.length === 0) {
    return NextResponse.json({ timelineData: [], error: 'Invalid or missing pageNames parameter' }, { status: 400 });
  }

  try {
    const timelines = await Promise.all(
      pageNames.map(async (pageName) => {
        const timeline = await prisma.timeline.findUnique({
          where: { pageName_language: { pageName, language: 'en' } },
        });
        if (timeline) return timeline.timelineData;

        const wikiResponse = await fetch(`http://localhost:3000/api/extractWikiPage?pageName=${pageName}`);
        const { wikiPage } = await wikiResponse.json();
        if (!wikiPage) return [];

        const summaryResponse = await fetch('http://localhost:3000/api/summarizeWiki2Timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageName, wikiPage }),
        });
        const { events } = await summaryResponse.json();
        if (!events) return [];

        await prisma.timeline.create({
          data: {
            pageName,
            language: 'en',
            wikipediaPage: `https://en.wikipedia.org/wiki/${pageName}`,
            timelineData: events,
          },
        });

        return events;
      })
    );

    const mergedTimelineData = timelines.flat();
    return NextResponse.json({ timelineData: mergedTimelineData });
  } catch (error: any) {
    return NextResponse.json({ timelineData: [], error: error.message }, { status: 500 });
  }
}