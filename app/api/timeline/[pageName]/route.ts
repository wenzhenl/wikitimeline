import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { TimelineAPIResponse, PageTimeline, TimelineEvent } from '@/app/types/timeline';

// Initialize Gemini and Redis
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const redis = Redis.fromEnv();
let cachedSystemPrompt: string | null = null;

// Add version constant at the top
const CURRENT_PROMPT_VERSION = "v1";  // Manually bump this when updating the prompt

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;

  const promptPath = path.join(process.cwd(), 'app/prompts/timeline-generator.txt');
  try {
    const rawPrompt = await fs.readFile(promptPath, 'utf-8');
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

async function generateTimeline(pageName: string, content: string): Promise<TimelineEvent[] | null> {
  const systemPrompt = await getSystemPrompt();
  const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0
    }
  });
  
  try {
    const result = await geminiModel.generateContent(
      `${systemPrompt}\n\nCreate a timeline for ${pageName.trim()} (${content})`
    );
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const timelineData = JSON.parse(jsonStr);
    return timelineData.timeline;
  } catch (error) {
    logger.error('Error generating timeline:', error);
    return null;
  }
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
        const cacheKey = `timeline:${trimmedName}`;
        
        // Try to get cached timeline
        let timeline: TimelineEvent[] | null = null;
        let cachedVersion: string | null = null;
        
        try {
          const cached = await redis.get(cacheKey);
          if (cached && typeof cached === 'object') {
            timeline = (cached as { timeline: TimelineEvent[], version: string }).timeline;
            cachedVersion = (cached as { timeline: TimelineEvent[], version: string }).version;
            
            // Only use cache if version matches
            if (cachedVersion !== CURRENT_PROMPT_VERSION) {
              logger.info(`Cache version mismatch for ${trimmedName} (${cachedVersion} vs ${CURRENT_PROMPT_VERSION}), regenerating...`);
              timeline = null;
            } else {
              logger.info(`Cache hit for timeline: ${trimmedName} (version ${cachedVersion})`);
            }
          }
        } catch (error) {
          logger.warn('Cache read error:', error);
        }

        // Generate new timeline if no cache or version mismatch
        if (!timeline) {
          try {
            const page = await wiki.page(trimmedName);
            const content = await page.content();
            timeline = await generateTimeline(trimmedName, content);
            
            if (timeline) {
              // Store timeline with current version
              await redis.set(cacheKey, { timeline, version: CURRENT_PROMPT_VERSION });
              logger.info(`Cached new timeline for ${trimmedName} (version ${CURRENT_PROMPT_VERSION})`);
            } else {
              failedPages.push(trimmedName);
              return;
            }
          } catch (error) {
            logger.error('Error fetching Wikipedia content:', error);
            failedPages.push(trimmedName);
            return;
          }
        }

        // Check if timeline is empty
        if (!timeline?.length) {
          noTimelinePages.push(trimmedName);
          return;
        }

        // Only fetch thumbnail if we have a timeline
        let thumbnail: string | undefined;
        try {
          const page = await wiki.page(trimmedName);
          const summary = await page.summary();
          thumbnail = summary.thumbnail?.source;
        } catch (error) {
          logger.warn('Could not fetch thumbnail, continuing without it:', error);
        }

        // Store results
        timelines[trimmedName] = {
          timeline,
          wikiSummary: {
            pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(trimmedName)}`,
            thumbnail
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