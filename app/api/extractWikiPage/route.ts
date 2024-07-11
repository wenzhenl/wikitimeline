import { NextResponse } from 'next/server';
import wiki from 'wikipedia';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageName = searchParams.get('pageName');

  if (!pageName) {
    return NextResponse.json({ error: 'Missing pageName parameter' }, { status: 400 });
  }

  try {
    const wikiPage = await wiki.content(pageName);
    return NextResponse.json({ wikiPage });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}