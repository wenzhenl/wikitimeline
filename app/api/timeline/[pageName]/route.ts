import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, PageTimeline, TimelineEvent } from '@/app/types/timeline';
import { PAGE_DELIMITER } from "@/app/constants";
import { unstable_cache } from 'next/cache';
import { SITE_CONFIG } from "@/app/config/site";

// Initialize Redis
const redis = Redis.fromEnv();

// Initialize Wikipedia with User-Agent
const userAgent = `WikiTimeline/1.0.0 (${SITE_CONFIG.DOMAIN}; wikitimeline2024@gmail.com)`;
wiki.setUserAgent(userAgent);
logger.info('Wikipedia User-Agent set:', userAgent);

const CURRENT_PROMPT_VERSION = "v1";
const FORCE_REGENERATE_ON_VERSION_MISMATCH = false;  // Set to true to regenerate on version mismatch

// Move prompt to a constant string
const SYSTEM_PROMPT = `
You are a timeline generator that extracts events from provided Wikipedia article content. 
Your task is to carefully read through the provided article text and identify ALL events that have associated dates and are directly related to the subject. You must not skip or omit any dated events.

The input consists of two parts:
1. A summary of the subject (for context)
2. The main content to extract events from

Create a comprehensive chronological timeline by:
1. Using the summary to understand the subject context
2. Identifying and extracting EVERY single date and associated event in the main content
3. Only including events that are directly related to the main subject
4. Organizing events chronologically from earliest to latest
5. Do not extract events that are only mentioned in the summary - focus on the main content

Return a JSON object with a 'timeline' object containing:
* 'title' (comprehensive description of the timeline subject that:
    - Provides key context about who/what the subject is
    - Includes their main achievements or significance
    - Summarizes their historical impact or legacy
    - Example: "Albert Einstein (1879-1955): German-born theoretical physicist who revolutionized modern physics with his theory of relativity, won the Nobel Prize in Physics, and became one of history's most influential scientists")
* 'birthDate' (if the subject is a person and birth date is known, in YYYY-MM-DD, YYYY-MM, or YYYY format)
* 'deathDate' (if the subject is a person and death date is known, in YYYY-MM-DD, YYYY-MM, or YYYY format)
* 'events' array, where each event has:
    - 'headline' (concise, self-contained title that clearly describes the event)
    - 'description' (comprehensive description that:
        * Provides full historical context by including relevant information from surrounding text
        * Explains the significance and impact of the event
        * Includes key preceding events or conditions that led to this event
        * Connects the event to the broader historical narrative
        * Avoids direct quotes from Wikipedia
        * Can be multiple sentences if needed to properly explain the event
    - 'startDate' (required, use the most precise date available, following these formats:
        * YYYY for year only (e.g., '0220' or '-0220' for 220 BCE)
        * YYYY-MM for year and month
        * YYYY-MM-DD for full dates)
    - 'endDate' (optional, for events that span a period, using same format as startDate)

When writing descriptions:
1. Look beyond just the sentence containing the date
2. Include relevant context from surrounding paragraphs
3. Explain the historical progression leading to the event
4. Connect events to form a coherent narrative
5. Include important related events even if they don't have explicit dates
6. Explain cause-and-effect relationships
7. Highlight the significance and impact of each event
8. Use as many sentences as needed for proper context
9. Make each description self-contained but connected to the larger story

IMPORTANT:
- Extract ALL events that have explicit dates mentioned in the article - do not skip any
- Include every single dated event, no matter how minor it might seem
- For dates before year 0 (BCE/BC), use negative years (e.g., '-0221' for 221 BCE)
- Do not include events or dates from your training data - only use what's in the provided article
- If a date appears in the text but is ambiguous or seems incorrect, exclude it
- If the article contains no dated events, return an empty array
- For date ranges:
  * Use startDate for the beginning of the range
  * Use endDate for the end of the range
  * Include both dates in the text description
  * Use clear language like "from [start] to [end]" or "between [start] and [end]"
- For single-date events, only use startDate
- Always include the full date(s) in the text description for context

Focus on extracting:
- ALL life events (birth, death, marriages, etc.)
- ALL career milestones
- ALL accomplishments
- ALL significant historical events
- ALL publication or release dates
- ANY other dated events directly involving the subject

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

Each event should either:
- Mark a clear turning point
- Show significant impact
- Reveal important character/career development
- Provide crucial historical context
`;

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

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  }
];

async function generateTimeline(
  pageName: string, 
  content: string, 
  genAI: GoogleGenerativeAI
): Promise<TimelineEvent[] | null> {

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
    systemInstruction: SYSTEM_PROMPT
  });
  
  try {
    const prompt = `Create a timeline for ${JSON.stringify(pageName.trim())}.
Main content to extract events from: ${JSON.stringify(content)}`;
    
    const result = await geminiModel.generateContent(prompt);
    logger.debug("Result from gemini:", result);

    const response = result.response;
    const text = response.text();
    
    const timelineData = JSON.parse(text);
    return timelineData.timeline;
  } catch (error) {
    logger.error('Error generating timeline:', error);
    return null;
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