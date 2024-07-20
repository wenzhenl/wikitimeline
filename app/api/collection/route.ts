import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

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
        timelineLanguage: 'en',
      })),
    });

    return new NextResponse('Collection saved successfully', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new NextResponse(error.message, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    return new NextResponse('Unknown error occurred', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}