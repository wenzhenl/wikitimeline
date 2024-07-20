import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const { description, pageNames } = await request.json();

  if (!description || !pageNames) {
    return NextResponse.json({ error: 'Missing description or pageNames parameter' }, { status: 400 });
  }

  try {
    const collection = await prisma.collection.create({
      data: {
        description,
      },
    });

    await prisma.collectionTimeline.createMany({
      data: pageNames.map((pageName: string) => ({
        collectionId: collection.id,
        timelinePageName: pageName,
        timelineLanguage: 'en', // Assuming all pageNames are in English
      })),
    });

    return NextResponse.json({ message: 'Collection saved successfully' });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}