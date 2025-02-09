/**
 * Test script for timeline generation using different LLM providers
 * 
 * Usage:
 *   npm run ts-node scripts/test-prompt.ts "<page_name>" [model]
 * 
 * Arguments:
 *   page_name: Wikipedia page name (required)
 *   model: LLM provider (optional, defaults to 'gemini')
 *          Supported values: 'deepseek', 'gemini', 'openai'
 * 
 * Examples:
 *   npm run ts-node scripts/test-prompt.ts "World War II" gemini
 *   npm run ts-node scripts/test-prompt.ts "Albert Einstein" openai
 *   npm run ts-node scripts/test-prompt.ts "Ancient Rome" deepseek
 * 
 * Environment Variables Required:
 *   DEEPSEEK_API_KEY: For Deepseek model
 *   GEMINI_API_KEY: For Google Gemini model
 *   OPENAI_API_KEY: For OpenAI model
 * 
 * Output:
 *   Results will be written to prompt-tests/<page_name>-<model>.json
 */

require('dotenv').config({ path: '.env.development.local' });
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const wiki = require('wikipedia');
const path = require('path');
const fs = require('fs').promises;

type SupportedModel = 'deepseek' | 'gemini' | 'openai';

let cachedSystemPrompt = '';

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(process.cwd(), 'scripts/prompts/timeline-generator.txt');
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
    // Decode the URL-encoded title first (in case it's already encoded)
    const decodedTitle = decodeURIComponent(title);
    // Then encode it properly for Wikipedia
    const encodedTitle = encodeURIComponent(decodedTitle);
    
    const page = await wiki.page(encodedTitle);
    const content = await page.content();
    console.log('content', content);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${encodedTitle}`,
      thumbnail: page.thumbnail?.source,
      content: content
    };
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
    throw error;
  }
}

async function getCompletion(pageName: string, summary: string, model: SupportedModel) {
  const systemPrompt = await getSystemPrompt();
  
  switch (model) {
    case 'deepseek':
      return getDeepseekCompletion(pageName, summary, systemPrompt);
    case 'gemini':
      return getGeminiCompletion(pageName, summary, systemPrompt);
    case 'openai':
      return getOpenAICompletion(pageName, summary, systemPrompt);
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

async function getDeepseekCompletion(pageName: string, summary: string, systemPrompt: string) {
  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Create a timeline for ${JSON.stringify(pageName.trim())} ${summary ? ` (${JSON.stringify(summary)})` : ''}`
      }
    ],
    model: "deepseek-chat",
    temperature: 0,
  });

  console.log('Deepseek token usage:', {
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_tokens: completion.usage?.total_tokens,
    model: completion.model,
  });

  return JSON.parse(completion.choices[0].message.content!);
}

async function getGeminiCompletion(pageName: string, summary: string, systemPrompt: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 8192,  // Set maximum output tokens
      temperature: 0
    }
  });
  
  const prompt = `${systemPrompt}\n\nCreate a timeline for ${JSON.stringify(pageName.trim())} ${summary ? ` (${JSON.stringify(summary)})` : ''}`;
  
  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Remove markdown JSON formatting
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse Gemini response:', text);
    throw error;
  }
}

async function getOpenAICompletion(pageName: string, summary: string, systemPrompt: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Create a timeline for ${JSON.stringify(pageName.trim())} ${summary ? ` (${JSON.stringify(summary)})` : ''}`
      }
    ],
    model: "gpt-4o",
    temperature: 0,
  });

  console.log('OpenAI token usage:', {
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_tokens: completion.usage?.total_tokens,
    model: completion.model,
  });

  return JSON.parse(completion.choices[0].message.content!);
}

async function main() {
  const [,, pageName, modelArg = 'gemini'] = process.argv;
  const model = modelArg as SupportedModel;

  if (!pageName) {
    console.error('Please provide a page name as an argument');
    process.exit(1);
  }

  if (!['deepseek', 'gemini', 'openai'].includes(model)) {
    console.error('Invalid model. Supported models: deepseek, gemini, openai');
    process.exit(1);
  }

  try {
    const outputDir = path.join(process.cwd(), 'prompt-tests');
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Fetching Wikipedia info for ${pageName}...`);
    const wikiInfo = await getWikipediaInfo(pageName);

    console.log(`Generating timeline using ${model}...`);
    const timeline = await getCompletion(pageName, wikiInfo.content, model);

    const outputPath = path.join(outputDir, `${pageName}-${model}.json`);
    await fs.writeFile(
      outputPath, 
      JSON.stringify(timeline, null, 2),
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