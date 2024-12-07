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
          content: "Extract dates and events from the text and format them as a chronological timeline. Return only a JSON array where each object has 'date' (in YYYY-MM-DD format) and 'text' (describing the event) properties."
        },
        {
          role: "user",
          content: content
        }
      ],
      model: "gpt-3.5-turbo-16k",
      response_format: { type: "json_object" },
    });

    const timeline = JSON.parse(completion.choices[0].message.content || '{"timeline": []}').timeline;

    return Response.json({ timeline });
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json(
      { error: 'Failed to process Wikipedia content' },
      { status: 500 }
    );
  }
} 