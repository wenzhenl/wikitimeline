require('dotenv').config({ path: '.env.development.local' });
const { OpenAI } = require('openai');
const wiki = require('wikipedia');
const path = require('path');
const fs = require('fs').promises;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let cachedSystemPrompt = '';

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(process.cwd(), 'app/prompts/timeline-generator.txt');
  try {
    const rawPrompt = await fs.readFile(promptPath, 'utf-8');
    
    cachedSystemPrompt = rawPrompt
      .replace(/\0/g, '')
      .replace(/\r\n/g, '\n')
      .trim();
    
    return cachedSystemPrompt;
  } catch (error) {
    console.error('Error reading system prompt:', error);
    throw error;
  }
}

async function getWikipediaInfo(title: string) {
  try {
    const summary = await wiki.summary(title);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      thumbnail: summary.thumbnail?.source,
      summary: summary.extract
    };
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
    throw error;
  }
}

async function getCompletion(pageName: string, summary?: string) {
  const systemPrompt = await getSystemPrompt();
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Create a timeline for ${pageName.trim()} ${summary ? ` (${summary})` : ''}`
      }
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
  });

  console.log('Token usage:', {
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_tokens: completion.usage?.total_tokens,
  });

  return JSON.parse(completion.choices[0].message.content!);
}

async function main() {
  const pageName = process.argv[2];
  if (!pageName) {
    console.error('Please provide a page name as an argument');
    process.exit(1);
  }

  try {
    const outputDir = path.join(process.cwd(), 'prompt-tests');
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Fetching Wikipedia info for ${pageName}...`);
    const wikiInfo = await getWikipediaInfo(pageName);

    console.log('Generating timeline...');
    const timeline = await getCompletion(pageName, wikiInfo.summary);

    const result = {
      wikipedia: wikiInfo,
      timeline: timeline
    };

    const outputPath = path.join(outputDir, `${pageName}.json`);
    await fs.writeFile(
      outputPath, 
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    console.log(`Results written to ${outputPath}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 