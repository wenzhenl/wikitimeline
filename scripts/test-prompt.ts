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
const { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
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

// Add interface for Wikipedia info
interface WikipediaInfo {
  pageUrl: string;
  thumbnail?: string;
  summary: string;
  content: string;
}

async function getWikipediaInfo(title: string): Promise<WikipediaInfo> {
  try {
    // Decode the URL-encoded title first (in case it's already encoded)
    const decodedTitle = decodeURIComponent(title);
    // Then encode it properly for Wikipedia
    const encodedTitle = encodeURIComponent(decodedTitle);
    
    const page = await wiki.page(encodedTitle);
    const [content, summary] = await Promise.all([
      page.content(),
      page.summary()
    ]);

    return {
      pageUrl: `https://en.wikipedia.org/wiki/${encodedTitle}`,
      thumbnail: page.thumbnail?.source,
      summary,
      content
    };
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
    throw error;
  }
}

async function getCompletion(pageName: string, wikiInfo: WikipediaInfo, model: SupportedModel) {
  const systemPrompt = await getSystemPrompt();
  
  switch (model) {
    case 'gemini':
      return getGeminiCompletion(pageName, wikiInfo, systemPrompt);
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

interface TimelineEvent {
  headline: string;
  description: string;
  startDate: string;
  endDate?: string;
}

async function getGeminiCompletion(pageName: string, wikiInfo: WikipediaInfo, systemPrompt: string) {

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  // Helper function to compare dates that might be in YYYY, YYYY-MM, or YYYY-MM-DD format
  function compareDates(dateA: string, dateB: string): number {
    const aIsNegative = dateA.startsWith("-");
    const bIsNegative = dateB.startsWith("-");
    
    const aParts = (aIsNegative ? dateA.slice(1) : dateA)
      .split("-")
      .map(Number);
    const bParts = (bIsNegative ? dateB.slice(1) : dateB)
      .split("-")
      .map(Number);
    
    const aYear = aParts[0] * (aIsNegative ? -1 : 1);
    const bYear = bParts[0] * (bIsNegative ? -1 : 1);

    if (aYear !== bYear) return aYear - bYear;
    if (aParts[1] && bParts[1] && aParts[1] !== bParts[1]) return aParts[1] - bParts[1];
    if (aParts[2] && bParts[2]) return aParts[2] - bParts[2];
    return aParts.length - bParts.length;
  }
  
  // Simplified safety settings
  const safetySettings = [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "OFF"
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "OFF"
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "OFF"
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "OFF"
    }
  ];

  const timelineSchema = {
    type: SchemaType.OBJECT,
    properties: {
      timeline: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Brief description of the timeline subject",
          },
          birthDate: {
            type: SchemaType.STRING,
            description: "Birth date of the person (YYYY-MM-DD, YYYY, or YYYY-MM format), if applicable and known"
          },
          deathDate: {
            type: SchemaType.STRING,
            description: "Death date of the person (YYYY-MM-DD, YYYY, or YYYY-MM format), if applicable and known"
          },
          events: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                headline: {
                  type: SchemaType.STRING,
                  description: "Short headline of the event",
                },
                description: {
                  type: SchemaType.STRING,
                  description: "Detailed description of the event",
                },
                startDate: {
                  type: SchemaType.STRING,
                  description: "Start date of the event (YYYY-MM-DD, YYYY, or YYYY-MM format)",
                },
                endDate: {
                  type: SchemaType.STRING,
                  description: "End date of the event if it's a range (YYYY-MM-DD, YYYY, or YYYY-MM format)"
                }
              },
              required: ["headline", "description", "startDate"]
            }
          }
        },
        required: ["title", "events"]
      }
    },
    required: ["timeline"]
  };

  async function tryCompletion(contentChunk: string) {
    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 1,
        responseMimeType: "application/json",
        responseSchema: timelineSchema,
        topP: 0.95,
        topK: 40,
        presencePenalty: 0.1,
        candidateCount: 1,
        stopSequences: ["```"],
      },
      safetySettings,
      systemInstruction: systemPrompt
    });
    
    const prompt = `Create a timeline for ${JSON.stringify(pageName.trim())}.
Summary for context: ${JSON.stringify(wikiInfo.summary)}
Main content to extract events from: ${JSON.stringify(contentChunk)}`;
    
    const result = await geminiModel.generateContent(prompt);
    console.log('result', JSON.stringify(result, null, 2));
    const response = await result.response;
    
    // Check if response was truncated
    if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      throw new Error('MAX_TOKENS_REACHED');
    }

    const timeline = JSON.parse(response.text());
    
    // Sort events by startDate
    timeline.timeline.events.sort((a: TimelineEvent, b: TimelineEvent) => 
      compareDates(a.startDate, b.startDate)
    );
    
    return timeline;
  }

  try {
    // First attempt with full content
    return await tryCompletion(wikiInfo.content);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'MAX_TOKENS_REACHED') {
      console.log('Content too long, splitting into chunks...');
      
      // Split content into two roughly equal parts
      const midPoint = Math.floor(wikiInfo.content.length / 2);
      const splitIndex = wikiInfo.content.indexOf('. ', midPoint) + 1; // Split at sentence boundary
      
      const firstHalf = wikiInfo.content.substring(0, splitIndex);
      const secondHalf = wikiInfo.content.substring(splitIndex);

      // Process both halves with the same summary context
      const [firstTimeline, secondTimeline] = await Promise.all([
        tryCompletion(firstHalf),
        tryCompletion(secondHalf)
      ]);

      // Merge the timelines
      return {
        timeline: {
          title: firstTimeline.timeline.title,
          birthDate: firstTimeline.timeline.birthDate || secondTimeline.timeline.birthDate,
          deathDate: firstTimeline.timeline.deathDate || secondTimeline.timeline.deathDate,
          events: [
            ...firstTimeline.timeline.events,
            ...secondTimeline.timeline.events
          ].sort((a: TimelineEvent, b: TimelineEvent) => 
            compareDates(a.startDate, b.startDate)
          )
        }
      };
    }
    throw error;
  }
}

async function main() {
  const [,, pageName, modelArg = 'gemini'] = process.argv;
  const model = modelArg as SupportedModel;

  if (!pageName) {
    console.error('Please provide a page name as an argument');
    process.exit(1);
  }

  if (!['gemini'].includes(model)) {
    console.error('Invalid model. Supported models: deepseek, gemini, openai');
    process.exit(1);
  }

  try {
    const outputDir = path.join(process.cwd(), 'prompt-tests');
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Fetching Wikipedia info for ${pageName}...`);
    const wikiInfo = await getWikipediaInfo(pageName);

    console.log(`Generating timeline using ${model}...`);
    const timeline = await getCompletion(pageName, wikiInfo, model);

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