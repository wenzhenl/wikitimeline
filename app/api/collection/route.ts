import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function OPTIONS(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const { description, pageNames } = await request.json();

  if (!description || !pageNames) {
    return new NextResponse(JSON.stringify({ error: 'Missing description or pageNames parameter' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
      },
    });
  }

  try {
    const collection = await prisma.collection.create({
      data: { description },
    });

    await prisma.collectionTimeline.createMany({
      data: pageNames.map((pageName: string) => ({
        collectionId: collection.id,
        timelinePageName: pageName,
        timelineLanguage: 'en',
      })),
    });

    return new NextResponse(JSON.stringify({ message: 'Collection saved successfully' }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error saving collection:", error.message);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
        },
      });
    }
    console.error("Unknown error occurred");
    return new NextResponse(JSON.stringify({ error: 'Unknown error occurred' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
      },
    });
  }
}