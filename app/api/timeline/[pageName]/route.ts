import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, Timeline, TimelineEvent } from '@/app/types/timeline';
import { PAGE_DELIMITER } from "@/app/constants";
import { unstable_cache } from 'next/cache';
import { SITE_CONFIG } from "@/app/config/site";
import { SYSTEM_PROMPT } from "@/app/constants/gemini/systemPrompt";
import { TIMELINE_SCHEMA } from "@/app/constants/gemini/timelineSchema";
import { SAFETY_SETTINGS } from "@/app/constants/gemini/safetySettings";
// Initialize Redis
const redis = Redis.fromEnv();

// Initialize Wikipedia with User-Agent
const userAgent = `WikiTimeline/1.0.0 (${SITE_CONFIG.DOMAIN}; wikitimeline2024@gmail.com)`;
wiki.setUserAgent(userAgent);
logger.info('Wikipedia User-Agent set:', userAgent);

const CURRENT_PROMPT_VERSION = "v1";
const FORCE_REGENERATE_ON_VERSION_MISMATCH = false;  // Set to true to regenerate on version mismatch

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

async function generateTimelineUsingGemini(
  pageName: string, 
  wikiSummary: string,
  contentChunk: string,
  genAI: GoogleGenerativeAI): Promise<Timeline> {
  const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: TIMELINE_SCHEMA,
      topP: 0.95,
      topK: 40,
      presencePenalty: 0.1,
      candidateCount: 1,
      stopSequences: ["```"],
    },
    safetySettings: SAFETY_SETTINGS,
    systemInstruction: SYSTEM_PROMPT
  });
  
  const prompt = `Create a timeline for ${JSON.stringify(pageName.trim())}.
Summary for context: ${JSON.stringify(wikiSummary)}
Main content to extract events from: ${JSON.stringify(contentChunk)}`;
  
  const result = await geminiModel.generateContent(prompt);
  logger.debug('result', JSON.stringify(result, null, 2));
  const response = result.response;
  
  // Check if response was truncated
  if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new Error('MAX_TOKENS_REACHED');
  }

  return JSON.parse(response.text());
}

function mergeTimelines(first: Timeline, second: Timeline): Timeline {
  return {
    title: first.title,  // Use first timeline's title
    birthDate: first.birthDate || second.birthDate,
    deathDate: first.deathDate || second.deathDate,
    events: [...first.events, ...second.events],
    lastUpdatedAt: Date.now()
  };
}

function postProcessTimeline(timeline: Timeline): Timeline {
  return {
    ...timeline,
    events: timeline.events
      .sort((a, b) => compareDates(a.startDate, b.startDate))
      // Optional: Remove duplicate events based on headline and date
      .filter((event, index, self) => 
        index === self.findIndex(e => 
          e.startDate === event.startDate && 
          e.headline === event.headline
        )
      )
  };
}

async function generateTimeline(
  pageName: string, 
  wikiSummary: string,
  wikiContent: string, 
  genAI: GoogleGenerativeAI
): Promise<Timeline | null> {
  try {
    // First attempt with full content
    const timeline = await generateTimelineUsingGemini(pageName, wikiSummary, wikiContent, genAI);
    return postProcessTimeline(timeline);
  } catch (error: unknown) {
    logger.error('Error generating timeline:', error);

    if (error instanceof Error && error.message === 'MAX_TOKENS_REACHED') {
      console.log('Content too long, splitting into chunks...');
      
      const midPoint = Math.floor(wikiContent.length / 2);
      const splitIndex = wikiContent.indexOf('. ', midPoint) + 1;
      
      const firstHalf = wikiContent.substring(0, splitIndex);
      const secondHalf = wikiContent.substring(splitIndex);

      const [firstTimeline, secondTimeline] = await Promise.all([
        generateTimelineUsingGemini(pageName, wikiSummary, firstHalf, genAI),
        generateTimelineUsingGemini(pageName, wikiSummary, secondHalf, genAI)
      ]);

      const mergedTimeline = mergeTimelines(firstTimeline, secondTimeline);
      return postProcessTimeline(mergedTimeline);
    }
    throw error;
  }
}

// Cache the wiki summary
// Add route segment config
export const runtime = 'edge';
export const revalidate = 3600; // Cache for 1 hour

const getCachedWikiSummary = unstable_cache(
  async (pageName: string) => {
    try {
      const summary = await wiki.summary(pageName);
      return {
        canonicalTitle: summary.titles.canonical,
        thumbnail: summary.thumbnail?.source
      };
    } catch (error) {
      logger.warn('Could not fetch wiki summary, using fallback:', error);
      return {
        canonicalTitle: pageName,
        thumbnail: undefined
      };
    }
  },
  ['wiki-summary'],
  {
    revalidate: 3600,
    tags: ['wiki-summary']
  }
);

// Initialize Gemini with appropriate key based on client type
function getGeminiClient(clientType: string | null): GoogleGenerativeAI {
  const apiKey = clientType === 'cli' 
    ? process.env.GEMINI_CLI_API_KEY 
    : process.env.GEMINI_API_KEY;
  
  return new GoogleGenerativeAI(apiKey!);
}

export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
): Promise<Response> {
  const clientType = request.headers.get('x-internal-client-type');
  const genAI = getGeminiClient(clientType);
  
  try {
    // First decode the URL parameters
    const pageNames = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .map(name => name.trim())
      .filter(Boolean);

    // Get canonical names first
    const canonicalNames = await Promise.all(
      pageNames.map(async (name) => {
        const summary = await getCachedWikiSummary(name);
        if (summary.canonicalTitle !== name) {
          logger.info(`Redirecting ${name} to canonical title: ${summary.canonicalTitle}`);
        }
        return summary.canonicalTitle;
      })
    );

    const failedPages: string[] = [];
    const noTimelinePages: string[] = [];
    const timelines: Record<string, PageTimeline> = {};

    await Promise.all(
      canonicalNames.map(async (pageName) => {
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
            if (cachedVersion !== CURRENT_PROMPT_VERSION && FORCE_REGENERATE_ON_VERSION_MISMATCH) {
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
            timeline = await generateTimeline(trimmedName, content, genAI);
            
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
          thumbnail = (await getCachedWikiSummary(trimmedName)).thumbnail;
        } catch (error) {
          logger.warn('Could not fetch cached thumbnail:', error);
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