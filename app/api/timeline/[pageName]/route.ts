import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { TimelineAPIResponse, PageTimeline, TimelineEvent } from '@/app/types/timeline';
import { PAGE_DELIMITER } from "@/app/constants";

// Initialize Gemini and Redis
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const redis = Redis.fromEnv();
let cachedSystemPrompt: string | null = null;

// Move prompt to a constant string
const SYSTEM_PROMPT = `
You are a timeline generator that extracts events from provided Wikipedia article content. 
Your task is to carefully read through the provided article text and identify all events that have associated dates and are directly related to the subject.

Create a comprehensive chronological timeline by:
1. Identifying all dates and associated events in the provided text
2. Only including events that are directly related to the main subject
3. Organizing events chronologically from earliest to latest
4. If total output would exceed token limit, prioritize most significant events and drop less important ones

Return a JSON object with a 'timeline' array. Each event should have:
* 'headline' (concise, self-contained title that clearly describes the event)
* 'text' (clear, concise description that:
    - Summarizes the event in your own words
    - Provides necessary context without relying on surrounding events
    - Avoids direct quotes from Wikipedia
    - Keeps to 1-2 sentences when possible)
* 'date' (use the most precise date available, following these formats:
    - YYYY for year only (e.g., '0220' or '-0220' for 220 BCE)
    - YYYY-MM for year and month
    - YYYY-MM-DD for full dates)

IMPORTANT:
- Only extract events that have explicit dates mentioned in the article
- For dates before year 0 (BCE/BC), use negative years (e.g., '-0221' for 221 BCE)
- Do not include events or dates from your training data - only use what's in the provided article
- If a date appears in the text but is ambiguous or seems incorrect, exclude it
- If the article contains no dated events, return an empty array
- For date ranges:
  * Always create a single event using the start date
  * Include the end date in the text description
  * Use clear language like "from [start] to [end]" or "between [start] and [end]"
- Always include the full date in the text description for context
- If output would exceed token limit, prioritize:
  1. Major life events (birth, death)
  2. Career-defining moments
  3. Most historically significant achievements
  4. Drop less impactful or redundant events

Focus on extracting:
- Life events (birth, death, marriages, etc.), these are must-have events, especially birth and death
- Career milestones
- Major accomplishments
- Significant historical events
- Publication or release dates
- Any other dated events directly involving the subject

Do not include:
- Events without clear dates
- Events not directly related to the subject
- Dates from referenced works or citations
- Future dates or predictions
- Duplicate events with identical information

Prioritize events that:
1. Mark significant changes or turning points
2. Demonstrate lasting impact or influence
3. Show key character/career development
4. Provide necessary historical context

Aim for 15-20 most meaningful events that together tell a coherent story. Quality and significance of events matter more than quantity. Each event should either:
- Mark a clear turning point
- Show significant impact
- Reveal important character/career development
- Provide crucial historical context
`;

const CURRENT_PROMPT_VERSION = "v1";

async function generateTimeline(pageName: string, content: string): Promise<TimelineEvent[] | null> {
  const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0
    }
  });
  
  try {
    const prompt = `${SYSTEM_PROMPT}\n\nCreate a timeline for ${pageName.trim()} (${content})`;
    logger.debug("Prompt:", prompt);

    const result = await geminiModel.generateContent(prompt);
    logger.debug("Result from gemini:", result);

    const response = result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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
    // First decode the URL parameters
    const pageNames = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .map(name => name.trim())
      .filter(Boolean);
    
    const failedPages: string[] = [];
    const noTimelinePages: string[] = [];
    const timelines: Record<string, PageTimeline> = {};

    await Promise.all(
      pageNames.map(async (pageName) => {
        const trimmedName = pageName.trim();
        // Use the decoded name for the cache key
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
            // Use decoded name for Wikipedia API
            logger.debug("Fetching wiki page for:", trimmedName);
            const page = await wiki.page(trimmedName);
            const content = await page.content();
            timeline = await generateTimeline(trimmedName, content);
            
            if (timeline) {
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
          const summary = await wiki.summary(trimmedName);
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
        message: `Could not generate timeline for: ${problemPages.join(PAGE_DELIMITER)}`,
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