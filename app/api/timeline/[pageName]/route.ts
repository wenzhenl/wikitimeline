import { OpenAI } from 'openai';
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { TimelineAPIResponse, PageTimeline, WikiSummary, TimelineEvent } from '@/app/types/timeline';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Redis
const redis = Redis.fromEnv();

let cachedSystemPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(process.cwd(), 'app/prompts/timeline-generator.txt');
  try {
    // Read the file and sanitize the content
    const rawPrompt = await fs.readFile(promptPath, 'utf-8');
    
    // Remove any null characters and normalize line endings
    cachedSystemPrompt = rawPrompt
      .replace(/\0/g, '')
      .replace(/\r\n/g, '\n')
      .trim();
    
    return cachedSystemPrompt;
  } catch (error) {
    logger.error('Error reading system prompt:', error);
    throw new Error('Failed to read system prompt file');
  }
}

async function getWikipediaInfo(title: string): Promise<WikiSummary & { error?: string }> {
  const cacheKey = `summary:${title}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === 'object' && 'pageUrl' in cached) {
      logger.info(`Cache hit for Wikipedia page ${title}`);
      return cached as WikiSummary;
    }
  } catch (error) {
    logger.warn('Cache read error:', error);
  }

  try {
    const summary = await wiki.summary(title);
    const result: WikiSummary = {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      thumbnail: summary.thumbnail?.source,
      summary: summary.extract
    };

    await redis.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Error fetching Wikipedia info:', error);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      error: 'Could not fetch Wikipedia information',
      summary: undefined
    };
  }
}

async function getCachedCompletion(pageName: string, summary: string): Promise<{ timeline: TimelineEvent[] } | null> {
  const cacheKey = `timeline:${pageName}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for timeline: ${pageName}`);
      return cached as { timeline: TimelineEvent[] };
    }
  } catch (error) {
    logger.warn('Cache read error:', error);
  }

  if (!summary) {
    logger.warn(`Cannot generate timeline without summary for ${pageName}`);
    return null;
  }

  const systemPrompt = await getSystemPrompt();
  
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a timeline for ${pageName.trim()} (${summary})` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0,
  });

  // Log token usage
  logger.debug(`Token usage for ${pageName}:`, {
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_tokens: completion.usage?.total_tokens,
    cached_tokens: completion.usage?.prompt_tokens_details?.cached_tokens || 0,
    model: completion.model,
  });

  const result = JSON.parse(completion.choices[0].message.content!);
  
  try {
    await redis.set(cacheKey, result);
    logger.info(`Cached timeline for ${pageName}`);
  } catch (error) {
    logger.warn('Cache write error:', error);
  }

  return result;
}

export async function GET(
  _request: Request,
  { params }: { params: { pageName: string } }
): Promise<Response> {
  try {
    const pageNames = decodeURIComponent(params.pageName).split(',');
    const failedPages: string[] = [];
    const noTimelinePages: string[] = [];
    const timelines: Record<string, PageTimeline> = {};

    await Promise.all(
      pageNames.map(async (pageName) => {
        const trimmedName = pageName.trim();
        
        // Get Wikipedia info first
        const wikiInfo = await getWikipediaInfo(trimmedName);
        if (wikiInfo.error) {
          failedPages.push(trimmedName);
          return;
        }

        // Then get timeline data using the wiki summary
        const timelineData = await getCachedCompletion(trimmedName, wikiInfo.summary!);
        if (!timelineData?.timeline?.length) {
          noTimelinePages.push(trimmedName);
          return;
        }

        // Store results
        timelines[trimmedName] = {
          timeline: timelineData.timeline,
          wikiSummary: {
            pageUrl: wikiInfo.pageUrl,
            thumbnail: wikiInfo.thumbnail,
            summary: wikiInfo.summary
          }
        };
      })
    );

    const response: TimelineAPIResponse = { timelines };
    
    const problemPages = [...failedPages, ...noTimelinePages];
    if (problemPages.length > 0) {
      response.errors = {
        message: `Could not generate timeline for: ${problemPages.join(', ')}`,
        failedPages: problemPages,
        details: {
          noWikipediaData: failedPages,
          noTimelineGenerated: noTimelinePages
        }
      };
    }

    return Response.json(response);
  } catch (error) {
    logger.error('Error processing request:', error);
    return Response.json(
      { timelines: {}, errors: { message: 'Failed to generate timeline', failedPages: [] } } as TimelineAPIResponse,
      { status: 500 }
    );
  }
} 