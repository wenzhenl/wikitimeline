import { OpenAI } from 'openai';
import wiki from 'wikipedia';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getWikipediaInfo(title: string): Promise<{ pageUrl: string; thumbnail?: string }> {
  try {
    const summary = await wiki.summary(title);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      thumbnail: summary.thumbnail?.source
    };
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`
    };
  }
}

function formatGroupName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
) {
  try {
    const pageNames = decodeURIComponent(params.pageName).split(',');
    let allEvents = [];

    for (const pageName of pageNames) {
      // Get Wikipedia info including thumbnail
      const { pageUrl, thumbnail } = await getWikipediaInfo(pageName.trim());

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a timeline generator. Create a chronological timeline of major events for the given subject. Return a JSON object with a 'timeline' array containing events with 'date' (YYYY-MM-DD format) and 'text' (event description) properties. Focus on significant events and ensure dates are accurate."
          },
          {
            role: "user",
            content: `Create a timeline for ${pageName.trim()}`
          }
        ],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const parsedContent = JSON.parse(completion.choices[0].message.content!);
      const eventsWithGroup = parsedContent.timeline.map((event: any) => ({
        ...event,
        group: formatGroupName(pageName.trim()),
        media: {
          url: pageUrl,
          thumbnail: thumbnail,
        }
      }));
      allEvents.push(...eventsWithGroup);
    }

    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log('Generated events:', JSON.stringify(allEvents, null, 2));
    return Response.json({ timeline: allEvents });
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json(
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
} 