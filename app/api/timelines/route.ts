import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  try {
    const [items, totalItems] = await Promise.all([
      prisma.timeline.findMany({
        skip,
        take: limit,
      }),
      prisma.timeline.count(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({ items, totalPages });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}