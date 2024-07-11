import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(request: Request) {
  const { pageName, wikiPage } = await request.json();

  if (!pageName || !wikiPage) {
    return NextResponse.json({ error: 'Missing pageName or wikiPage parameter' }, { status: 400 });
  }

  const prompt = `
You are a world-class expert in summarizing Wikipedia pages into timelines and outputting them in JSON format. Please read carefully the content I passed and list out the most important events of ${pageName}, not exceeding 30 events. Output this as a JSON with a list of events, where each event follows the following format:

Event {
  start_date: { year: number; month?: number; day?: number };
  text: { headline: string; text: string };
  group?: string;
}

Ensure that the headline is a concise summary of the event in less than 10 words, and the text provides detailed information. The group should always be ${pageName}.
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt,
        },
        { role: "user", content: wikiPage },
      ],
      model: "gpt-4o",
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsedContent = JSON.parse(content);
    const events = parsedContent.events || parsedContent;

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}