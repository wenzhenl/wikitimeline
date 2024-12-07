import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
) {
  try {
    const pageName = decodeURIComponent(params.pageName).replace(/_/g, ' ');

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a timeline generator. Create a chronological timeline of major events for the given subject. Return a JSON object with a 'timeline' array containing events with 'date' (YYYY-MM-DD format) and 'text' (event description) properties. Focus on significant events and ensure dates are accurate."
        },
        {
          role: "user",
          content: `Create a timeline for ${pageName}`
        }
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const parsedContent = JSON.parse(completion.choices[0].message.content!);
    return Response.json({ timeline: parsedContent.timeline || [] });
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json(
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
} 