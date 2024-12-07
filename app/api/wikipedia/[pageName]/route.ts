import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function formatGroupName(name: string): string {
  return name
    .replace(/_/g, ' ')          // Replace underscores with spaces
    .split(' ')                  // Split into words
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()  // Capitalize first letter
    )
    .join(' ');
}

export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
) {
  try {
    // Handle multiple page names separated by comma
    const pageNames = decodeURIComponent(params.pageName).split(',');
    let allEvents = [];

    for (const pageName of pageNames) {
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
        group: formatGroupName(pageName.trim())
      }));
      allEvents.push(...eventsWithGroup);
    }

    // Sort all events chronologically
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return Response.json({ timeline: allEvents });
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json(
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
} 