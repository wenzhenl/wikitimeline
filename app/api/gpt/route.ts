import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(request: Request) {
  const { pageName, wikiPage, thumbnailSource } = await request.json();

  if (!pageName || !wikiPage) {
    return NextResponse.json({ error: 'Missing pageName or wikiPage parameter' }, { status: 400 });
  }
  const polishedPageName = pageName.replace(/_/g, " ")
  const prompt = `
  You are a world-class expert in summarizing Wikipedia pages into timelines and outputting them in JSON format. I will provide you with the content of a Wikipedia page.
  Based on this content, identify and list the most important events related to "${pageName}", ranked by significance, not exceeding 30 entries. 
  Output this as a JSON with a list of events in following format, please strictly follow the format:
  {
    events: [
      {
        "start_date": { "year": number, "month"?: number, "day"?: number },
        "text": { "headline": string, "text": string },
        "group": string,
        "media": { "url": string, "thumbnail"?: string }
      },
      ...
   ]
  }
  
  Guidelines:
  1. Rank the events by their significance, placing the most important events at the beginning of the list.
  2. Always include the "born" event if found.
  3. Use the smallest set of events to cover the timeline. Merge closely related events to avoid redundancy (e.g., "Bill Gates starts college" and "Bill Gates drops out of college" should be combined into one event).
  4. Ensure the events are highly relevant to the subject. For example, for Bill Gates, focus on events like founding Microsoft, major product launches, philanthropic milestones, and avoid less significant events like giving a TED talk.
  5. Merge events that occur close together in time into a single event to avoid clutter and ensure there are gaps between events for better visualization (e.g., combine "Bill Gates and Paul Allen founded Microsoft in 1975" and "The trade name 'Microsoft' was officially registered with the Secretary of State of New Mexico in 1976" into one event).
  
  Each event's headline should be a concise summary of the event in less than 10 words. The text should provide detailed information. Both the headline and text fields can include HTML markup for improved display. 
  The group field should always be "${polishedPageName}". 
  The media field should have the url set as "https://en.wikipedia.org/wiki/${pageName}" and thumbnail set as "${thumbnailSource}".
  
  Please ensure accuracy and relevance in the timeline.
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
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsedContent = JSON.parse(content);
    const events = parsedContent.events || parsedContent;

    return NextResponse.json({ events });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}