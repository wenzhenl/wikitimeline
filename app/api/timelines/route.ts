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
        return timeline ? timeline.timelineData : [];
      })
    );

    const mergedTimelineData = timelines.flat();
    return NextResponse.json({ timelineData: mergedTimelineData });
  } catch (error: any) {
    return NextResponse.json({ timelineData: [], error: error.message }, { status: 500 });
  }
}