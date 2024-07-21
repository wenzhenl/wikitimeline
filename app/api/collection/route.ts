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
  const { description, pageNames } = await request.json();

  if (!description || !pageNames) {
    return NextResponse.json({ error: 'Missing description or pageNames parameter' }, { status: 400 });
  }

  try {
    const newCollection = await prisma.collection.create({
      data: {
        description,
        timelines: {
          create: pageNames.map((pageName: string) => ({
            pageName,
            language: 'en',
          })),
        },
      },
    });

    return NextResponse.json({ newCollection });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}