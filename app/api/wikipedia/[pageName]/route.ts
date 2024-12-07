import { OpenAI } from 'openai';
import wiki from 'wikipedia';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
) {
  try {
    // Fetch Wikipedia content
    const page = await wiki.page(params.pageName);
    const content = await page.content();

    // Get timeline from GPT
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Extract a chronological timeline from the text. Return a JSON object with a 'timeline' array containing events with 'date' (YYYY-MM-DD format) and 'text' (event description) properties."
        },
        {
          role: "user",
          content: content
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
      { error: 'Failed to process Wikipedia content' },
      { status: 500 }
    );
  }
} 