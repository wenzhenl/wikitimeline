import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BASE_URL } from "@/config";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageName = searchParams.get('pageName');

  if (!pageName) {
    return NextResponse.json({ error: 'Missing pageName parameter' }, { status: 400 });
  }

  try {
    const timeline = await prisma.timeline.findUnique({
      where: { pageName_language: { pageName, language: 'en' } },
    });

    if (timeline) {
      return NextResponse.json({ timelineData: timeline.timelineData });
    }

    const wikiResponse = await fetch(`${BASE_URL}/api/wiki?pageName=${pageName}`);
    const { wikiPage, thumbnailSource } = await wikiResponse.json();
    if (!wikiPage) return NextResponse.json({ error: 'Failed to extract wiki page' }, { status: 500 });

    const summaryResponse = await fetch(`${BASE_URL}/api/gpt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageName, wikiPage, thumbnailSource }),
    });
    const { events } = await summaryResponse.json();
    if (!events) return NextResponse.json({ error: 'Failed to summarize wiki page' }, { status: 500 });

    await prisma.timeline.create({
      data: {
        pageName,
        language: 'en',
        wikipediaPage: `https://en.wikipedia.org/wiki/${pageName}`,
        timelineData: events,
      },
    });

    return NextResponse.json({ timelineData: events });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}