import { NextResponse } from 'next/server';
import wiki from 'wikipedia';

type WikiResponse = {
  wikiPage: string;
  thumbnailSource?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageName = searchParams.get('pageName');

  if (!pageName) {
    return NextResponse.json({ error: 'Missing pageName parameter' }, { status: 400 });
  }

  try {
    const wikiPage = await wiki.content(pageName);
    const wikiSummary = await wiki.summary(pageName);

    const response: WikiResponse = { wikiPage };

    if (wikiSummary.thumbnail && wikiSummary.thumbnail.source) {
      response.thumbnailSource = wikiSummary.thumbnail.source;
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}