import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  const { description, contributor, pageNames } = await request.json();

  if (!description || !pageNames || !Array.isArray(pageNames)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    // First, check if all timelines exist
    const existingTimelines = await prisma.timeline.findMany({
      where: {
        AND: pageNames.map(pageName => ({
          pageName,
          language: 'en'
        }))
      }
    });

    if (existingTimelines.length !== pageNames.length) {
      return NextResponse.json({ error: 'One or more timelines do not exist' }, { status: 400 });
    }

    // If all timelines exist, create the collection
    const newCollection = await prisma.collection.create({
      data: {
        description,
        contributor: contributor || null,
        timelines: {
          create: pageNames.map((pageName: string) => ({
            timelinePageName: pageName,
            timelineLanguage: 'en'
          })),
        },
      },
      include: {
        timelines: {
          include: {
            timeline: true,
          },
        },
      },
    });

    return NextResponse.json({ newCollection });
  } catch (error: unknown) {
    console.error('Error saving collection:', error);
    return NextResponse.json({ error: 'Failed to save collection' }, { status: 500 });
  }
}