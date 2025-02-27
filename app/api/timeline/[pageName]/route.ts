import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, Timeline, TimelineWithWikiSummary, TimelineEvent, WikiSummary } from '@/app/types/timeline';
import { MIN_NUM_EVENTS_FOR_TIMELINE, PAGE_DELIMITER } from "@/app/constants";
import { unstable_cache } from 'next/cache';
import { SITE_CONFIG } from "@/app/config/site";
import { TIMELINE_SCHEMA } from "@/app/constants/gemini/timelineSchema";
import { SAFETY_SETTINGS } from "@/app/constants/gemini/safetySettings";
import { FORCE_REGENERATE_ON_VERSION_MISMATCH } from "@/app/constants";
import { CURRENT_PROMPT_VERSION } from "@/app/constants/gemini";

// Initialize Redis
const redis = Redis.fromEnv();

// Initialize Wikipedia with User-Agent
const userAgent = `WikiTimeline/1.0.0 (${SITE_CONFIG.DOMAIN}; wikitimeline2024@gmail.com)`;
wiki.setUserAgent(userAgent);
logger.info('Wikipedia User-Agent set:', userAgent);

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

function calculateAge(birthDate: string, eventDate: string): number | null {
  // Handle negative years (BCE)
  const birthYear = parseInt(birthDate.startsWith('-') ? birthDate.slice(1) : birthDate.split('-')[0]) * (birthDate.startsWith('-') ? -1 : 1);
  const eventYear = parseInt(eventDate.startsWith('-') ? eventDate.slice(1) : eventDate.split('-')[0]) * (eventDate.startsWith('-') ? -1 : 1);
  
  if (isNaN(birthYear) || isNaN(eventYear)) return null;
  
  return eventYear - birthYear;
}

// Enhanced post-processing function to handle events from multiple chunks
function postProcessTimeline(timeline: Timeline): Timeline {
  if (!timeline || !timeline.events || timeline.events.length === 0) {
    return {
      ...timeline,
      events: [],
      version: CURRENT_PROMPT_VERSION
    };
  }

  // Sort events by date
  const sortedEvents = [...timeline.events].sort((a, b) => {
    const aDate = a.startDate || '';
    const bDate = b.startDate || '';
    return aDate.localeCompare(bDate);
  });

  // Deduplicate events - more robust approach for events from multiple chunks
  const uniqueEvents: TimelineEvent[] = [];
  const seenHeadlines = new Set<string>();
  const seenDateHeadlinePairs = new Set<string>();

  for (const event of sortedEvents) {
    // Skip events without a start date
    if (!event.startDate) continue;

    // Create a unique key combining date and headline
    const dateHeadlineKey = `${event.startDate}|${event.headline}`;
    
    // Check for exact duplicates (same date and headline)
    if (seenDateHeadlinePairs.has(dateHeadlineKey)) {
      continue;
    }
    
    // Check for similar headlines (fuzzy matching)
    let isDuplicate = false;
    if (seenHeadlines.has(event.headline)) {
      // If we've seen this exact headline before, check if the dates are close
      for (const existingEvent of uniqueEvents) {
        if (existingEvent.headline === event.headline) {
          // If dates are within 1 year, consider it a duplicate
          const existingDate = new Date(existingEvent.startDate);
          const currentDate = new Date(event.startDate);
          const diffInDays = Math.abs((existingDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffInDays < 365) {
            isDuplicate = true;
            break;
          }
        }
      }
    } else {
      // Check for similar headlines with different wording
      for (const existingEvent of uniqueEvents) {
        // If dates are exactly the same, check for similar headlines
        if (existingEvent.startDate === event.startDate) {
          // Simple similarity check - if headlines share significant words
          const existingWords = new Set(existingEvent.headline.toLowerCase().split(/\s+/).filter(w => w.length > 3));
          const currentWords = event.headline.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          
          // If more than 50% of significant words match, consider it a duplicate
          const matchingWords = currentWords.filter(word => existingWords.has(word));
          if (matchingWords.length > 0 && matchingWords.length / currentWords.length > 0.5) {
            isDuplicate = true;
            break;
          }
        }
      }
    }
    
    if (!isDuplicate) {
      uniqueEvents.push(event);
      seenHeadlines.add(event.headline);
      seenDateHeadlinePairs.add(dateHeadlineKey);
    }
  }

  // Add age information for person timelines
  if (timeline.birthDate) {
    const birthYear = parseInt(timeline.birthDate.substring(0, 4));
    if (!isNaN(birthYear)) {
      uniqueEvents.forEach(event => {
        const eventYear = parseInt(event.startDate.substring(0, 4));
        if (!isNaN(eventYear)) {
          const age = eventYear - birthYear;
          if (age >= 0) {
            event.description = `${event.description} (Age: ${age})`;
          }
        }
      });
    }
  }

  // Return the processed timeline with version
  return {
    ...timeline,
    events: uniqueEvents,
    version: CURRENT_PROMPT_VERSION
  };
}

// Enhanced JSON repair function to handle truncated responses from any chunk
function attemptToRepairTruncatedJSON(jsonString: string): any {
  try {
    // First try to parse as-is
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn('JSON parsing failed, attempting repair');
    
    // Try to find the last complete event
    const timelineMatch = jsonString.match(/"timeline"\s*:\s*{/);
    const eventsMatch = jsonString.match(/"events"\s*:\s*\[/);
    
    if (!timelineMatch || !eventsMatch) {
      logger.error('Could not find timeline or events array in truncated JSON');
      throw new Error('JSON repair failed: missing timeline or events structure');
    }
    
    // Extract what we can from the truncated JSON
    let repairedJSON = '{"timeline":{"events":[]}}';
    
    try {
      // Try to extract title, birthDate, and deathDate if present
      const titleMatch = jsonString.match(/"title"\s*:\s*"([^"]+)"/);
      const birthDateMatch = jsonString.match(/"birthDate"\s*:\s*"([^"]+)"/);
      const deathDateMatch = jsonString.match(/"deathDate"\s*:\s*"([^"]+)"/);
      
      // Start building a valid JSON object
      let timelineObj: any = { events: [] };
      
      if (titleMatch && titleMatch[1]) {
        timelineObj.title = titleMatch[1];
      }
      
      if (birthDateMatch && birthDateMatch[1]) {
        timelineObj.birthDate = birthDateMatch[1];
      }
      
      if (deathDateMatch && deathDateMatch[1]) {
        timelineObj.deathDate = deathDateMatch[1];
      }
      
      // Extract complete events
      const eventRegex = /{[^{]*?"headline"\s*:\s*"[^"]+?"[^{]*?"description"\s*:\s*"[^"]+?"[^{]*?"startDate"\s*:\s*"[^"]+?"[^{}]*?}/g;
      const eventMatches = jsonString.match(eventRegex) || [];
      
      const events = [];
      for (const eventStr of eventMatches) {
        try {
          // Try to parse each event
          const event = JSON.parse(eventStr);
          if (event.headline && event.startDate) {
            events.push(event);
          }
        } catch (e) {
          // Skip this event if it can't be parsed
          continue;
        }
      }
      
      timelineObj.events = events;
      timelineObj.isComplete = false; // Mark as incomplete since we had to repair
      
      repairedJSON = JSON.stringify({ timeline: timelineObj });
      logger.info(`Repaired JSON with ${events.length} complete events`);
      
      return JSON.parse(repairedJSON);
    } catch (repairError) {
      logger.error('JSON repair attempt failed:', repairError);
      throw new Error('Failed to repair truncated JSON');
    }
  }
}

// Add this constant for chunk size
const MAX_CHUNK_SIZE = 8000; // Approximately 90% of max output token limit

// Improved function to split content into chunks with better boundary detection
function splitContentIntoChunks(content: string, maxChunkSize: number = MAX_CHUNK_SIZE): string[] {
  if (!content || content.length === 0) {
    return [''];
  }
  
  // If content is small enough, return it as a single chunk
  if (content.length < maxChunkSize) {
    return [content];
  }
  
  const chunks: string[] = [];
  let startPos = 0;
  
  while (startPos < content.length) {
    // Calculate end position for this chunk
    let endPos = Math.min(startPos + maxChunkSize, content.length);
    
    // Try to find a paragraph break near the end position
    const paragraphBreak = content.lastIndexOf('\n\n', endPos);
    if (paragraphBreak > startPos && paragraphBreak > endPos - 500) {
      endPos = paragraphBreak + 2; // Include the newlines
    } else {
      // If no paragraph break, try to find a sentence end
      const sentenceBreak = content.lastIndexOf('. ', endPos);
      if (sentenceBreak > startPos && sentenceBreak > endPos - 200) {
        endPos = sentenceBreak + 2; // Include the period and space
      }
    }
    
    // Add the chunk
    chunks.push(content.substring(startPos, endPos));
    startPos = endPos;
  }
  
  logger.info(`Split content into ${chunks.length} chunks (avg size: ${Math.round(content.length / chunks.length)} chars)`);
  return chunks;
}

// Modified function to generate timeline using parallel chunk processing
async function generateTimeline(
  pageName: string, 
  wikiContent: string,
  wikiSummary: string, 
  genAI: GoogleGenerativeAI
): Promise<Timeline | null> {
  // Split content into chunks
  const contentChunks = splitContentIntoChunks(wikiContent);
  logger.info(`Processing ${contentChunks.length} chunks for ${pageName}`);
  
  // Process all chunks in parallel
  const chunkResults = await Promise.all(
    contentChunks.map((chunk, index) => 
      processChunk(pageName, chunk, wikiSummary, index, contentChunks.length, genAI)
    )
  );
  
  // Collect all events and metadata
  let allEvents: TimelineEvent[] = [];
  let title = pageName;
  let birthDate: string | undefined;
  let deathDate: string | undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  // Process results from all chunks
  chunkResults.forEach((result, index) => {
    if (!result) {
      logger.warn(`Chunk ${index + 1}/${contentChunks.length} returned no results`);
      return;
    }
    
    // Add events from this chunk
    allEvents = [...allEvents, ...result.events];
    
    // Take metadata from first chunk that has it
    if (result.title && title === pageName) {
      title = result.title;
    }
    
    if (result.birthDate && !birthDate) {
      birthDate = result.birthDate;
    }
    
    if (result.deathDate && !deathDate) {
      deathDate = result.deathDate;
    }
    
    // Add token usage
    totalInputTokens += result.inputTokens || 0;
    totalOutputTokens += result.outputTokens || 0;
  });
  
  // Log token usage
  logger.debug(`Total token usage for ${pageName}: ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalInputTokens + totalOutputTokens} total tokens`);
  
  // If no events were found, return null
  if (allEvents.length === 0) {
    logger.warn(`No events found for ${pageName} across all chunks`);
    return null;
  }
  
  // Construct the final timeline
  const timeline = {
    title,
    birthDate,
    deathDate,
    events: allEvents,
  };
  
  // Post-process the timeline (sorts, deduplicates, and adds ages)
  return postProcessTimeline(timeline);
}

// New function to process a single chunk
async function processChunk(
  pageName: string,
  chunkContent: string,
  wikiSummary: string,
  chunkIndex: number,
  totalChunks: number,
  genAI: GoogleGenerativeAI
): Promise<{
  events: TimelineEvent[];
  title?: string;
  birthDate?: string;
  deathDate?: string;
  inputTokens?: number;
  outputTokens?: number;
} | null> {
  logger.info(`Processing chunk ${chunkIndex + 1}/${totalChunks} for ${pageName}`);
  
  // Create system instruction based on whether this is the first chunk
  const systemInstruction = getSystemInstruction(chunkIndex === 0);
  
  // Combine summary with chunk content
  const contentWithSummary = `SUMMARY: ${wikiSummary}\n\nCHUNK CONTENT (${chunkIndex + 1}/${totalChunks}): ${chunkContent}`;
  
  // Create user prompt
  const userPrompt = `
    Create a timeline for ${JSON.stringify(pageName.trim())}.
    Extract events with dates from the following content:
    ${JSON.stringify(contentWithSummary)}
  `;
  
  const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: TIMELINE_SCHEMA,
    },
    safetySettings: SAFETY_SETTINGS,
    systemInstruction: systemInstruction
  });
  
  try {
    const result = await geminiModel.generateContent(userPrompt);
    const response = result.response;
    
    // Log token usage
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    
    logger.debug(`Chunk ${chunkIndex + 1} token usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
    
    // Check if response was truncated
    const wasMaxTokensReached = response.candidates?.[0]?.finishReason === 'MAX_TOKENS';
    if (wasMaxTokensReached) {
      logger.warn(`MAX_TOKENS reached in chunk ${chunkIndex + 1}, attempting to repair truncated JSON`);
    }
    
    // Use the repair function to handle potentially truncated JSON
    let data;
    try {
      data = attemptToRepairTruncatedJSON(response.text());
      logger.info(`Successfully parsed JSON response from chunk ${chunkIndex + 1}${wasMaxTokensReached ? ' after repair' : ''}`);
    } catch (error) {
      logger.error(`Failed to parse JSON response from chunk ${chunkIndex + 1}: ${error}`);
      return null;
    }
    
    // Extract the timeline data
    const fragment = data.timeline;
    
    // Return events and metadata from this chunk
    return {
      events: fragment.events || [],
      title: fragment.title,
      birthDate: fragment.birthDate,
      deathDate: fragment.deathDate,
      inputTokens,
      outputTokens
    };
  } catch (error) {
    logger.error(`Error processing chunk ${chunkIndex + 1}/${totalChunks}:`, error);
    return null;
  }
}

// Helper function to get the appropriate system instruction based on chunk index
function getSystemInstruction(isFirstChunk: boolean): string {
  return `
You are a timeline generator that extracts events from provided Wikipedia article content. 
Your task is to carefully read through the provided article text and identify ALL events that have associated dates and are directly related to the subject.

Output JSONFormat:
{
  "timeline": {
    ${isFirstChunk ? `"title": "Concise description stating subject's name, years (if known), nationality/background, and primary significance. For events/periods, state what it is and its historical importance. For BCE dates, use BCE instead of negative years.",
    "birthDate": "Birth date (YYYY-MM-DD, YYYY, or YYYY-MM format) if subject is a person and date is known",
    "deathDate": "Death date (YYYY-MM-DD, YYYY, or YYYY-MM format) if applicable",` : ''}
    "events": [
      {
        "headline": "Concise, self-contained title describing the event",
        "description": "Clear, concise 1-2 sentence summary that provides context without relying on other events. Avoid direct Wikipedia quotes.",
        "startDate": "Most precise date available (YYYY, YYYY-MM, or YYYY-MM-DD). For BCE, use negative years (e.g. -0220)",
        "endDate": "Optional end date for ranges, using same format as startDate"
      }
    ],
    "isComplete": true
  }
}

IMPORTANT INSTRUCTIONS:
1. You are processing a CHUNK of the full article. The content includes a summary of the article followed by the chunk content.
2. Extract ALL events with explicit dates from this chunk, regardless of their perceived importance.
3. ${isFirstChunk ? 'For this first chunk, include the title, birthDate, and deathDate if available.' : 'Focus only on extracting events from this chunk.'}
4. Pay attention to the summary at the beginning to maintain context about the subject.

ACCURACY IS THE TOP PRIORITY:
- Only extract events that have explicit dates mentioned in the article
- For dates before year 0 (BCE/BC), use negative years (e.g., '-0221' for 221 BCE)
- Do not include events or dates from your training data - only use what's in the provided article
- If a date appears in the text but is ambiguous or seems incorrect, exclude it
- If the chunk contains no dated events, return an empty array and set isComplete to true
- For date ranges:
  * Always create a single event using the start date
  * Include the end date in the event description
  * Use clear language like "from [start] to [end]" or "between [start] and [end]"
- Always include the full date in the event description for context

EXTRACT ALL EVENTS WITH DATES:
- Do not filter events based on importance or significance
- Include every event that has an explicit date, even if it seems minor
- Life events (birth, death, marriages, etc.)
- Career milestones
- Accomplishments and achievements
- Historical events
- Publication or release dates
- Any other dated events directly involving the subject

Do not include:
- Events without clear dates
- Events not directly related to the subject
- Dates from referenced works or citations
- Future dates or predictions
`;
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

interface OldTimelineEvent {
  headline: string;
  text: string;
  date: string;
}

interface OldTimelineFormat {
  timeline: OldTimelineEvent[];
  version?: string;  // Make version optional
}

interface NewTimelineFormat {
  timeline: Timeline;
}

async function isOldFormat(data: any): Promise<boolean> {
  return Array.isArray(data.timeline);  // Only check if timeline is array
}

async function convertOldToNewFormat(oldData: OldTimelineFormat): Promise<Timeline> {
  return {
    title: '',
    events: oldData.timeline.map(event => ({
      headline: event.headline,
      description: event.text,
      startDate: event.date
    })),
    version: oldData.version || 'v0',  // Default to 'v0' if version missing
    lastUpdatedAt: Date.now()
  };
}

// Update the filterOutliersFromTimeline function to work with the new implementation
function filterOutliersFromTimeline(timeline: Timeline, scaleFactor: number = 40): Timeline {
  if (!timeline || !timeline.events || timeline.events.length < 5) {
    return timeline; // Not enough data points to filter outliers
  }

  // Extract years from events
  const years = timeline.events
    .map(event => {
      const startDate = event.startDate;
      if (!startDate) return null;
      
      // Handle BCE dates (negative years)
      if (startDate.startsWith('-')) {
        return -parseInt(startDate.substring(1).split('-')[0]);
      }
      
      return parseInt(startDate.split('-')[0]);
    })
    .filter((year): year is number => year !== null && !isNaN(year));

  if (years.length < 5) {
    return timeline; // Not enough valid years to filter outliers
  }

  // Calculate median
  const sortedYears = [...years].sort((a, b) => a - b);
  const medianYear = sortedYears[Math.floor(sortedYears.length / 2)];

  // Calculate MAD (Median Absolute Deviation)
  const deviations = sortedYears.map(year => Math.abs(year - medianYear));
  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const medianDeviation = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  // Avoid division by zero
  if (medianDeviation === 0) {
    return timeline;
  }

  // Filter events based on MAD
  const filteredEvents = timeline.events.filter(event => {
    const startDate = event.startDate;
    if (!startDate) return true; // Keep events without dates
    
    let year;
    if (startDate.startsWith('-')) {
      year = -parseInt(startDate.substring(1).split('-')[0]);
    } else {
      year = parseInt(startDate.split('-')[0]);
    }
    
    if (isNaN(year)) return true; // Keep events with invalid years
    
    // Calculate z-score using MAD
    const zScore = Math.abs(year - medianYear) / medianDeviation;
    
    // Keep events within the threshold (adjusted by scaleFactor)
    return zScore <= scaleFactor;
  });

  logger.info(`Filtered ${timeline.events.length - filteredEvents.length} outliers from ${timeline.events.length} events (scaleFactor: ${scaleFactor})`);

  return {
    ...timeline,
    events: filteredEvents
  };
}

// Update the GET handler to use the new implementation
export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
): Promise<Response> {
  const clientType = request.headers.get('x-internal-client-type');
  const genAI = getGeminiClient(clientType);
  
  // Check if we should filter outliers (default to true)
  const url = new URL(request.url);
  const filterOutliers = url.searchParams.get('filterOutliers') !== 'false';
  const scaleFactor = parseInt(url.searchParams.get('scaleFactor') || '40');
  
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
    const timelines: Record<string, TimelineWithWikiSummary> = {};

    await Promise.all(
      canonicalNames.map(async (pageName) => {
        const trimmedName = pageName.trim();
        // Use the decoded name for the cache key
        const cacheKey = `timeline:${trimmedName}`;
        
        // Try to get cached timeline
        let timeline: Timeline | null = null;
        
        try {
          const cached = await redis.get(cacheKey);
          if (cached && typeof cached === 'object') {
            if (await isOldFormat(cached)) {
              // Handle old format
              logger.info('Old data schema detected: ', trimmedName);
              const oldData = cached as OldTimelineFormat;
              const version = oldData.version || 'v0';
              if (version !== CURRENT_PROMPT_VERSION && FORCE_REGENERATE_ON_VERSION_MISMATCH) {
                logger.info(`Cache version mismatch for ${trimmedName} (${version} vs ${CURRENT_PROMPT_VERSION}), regenerating...`);
                timeline = null;
              } else {
                timeline = await convertOldToNewFormat(oldData);
                logger.info(`Using converted old format cache for ${trimmedName} (version ${version})`);
              }
            } else {
              // Handle new format
              logger.info('New data schema detected: ', trimmedName);
              timeline = (cached as NewTimelineFormat).timeline;
              if (timeline.version !== CURRENT_PROMPT_VERSION && FORCE_REGENERATE_ON_VERSION_MISMATCH) {
                logger.info(`Cache version mismatch for ${trimmedName} (${timeline.version} vs ${CURRENT_PROMPT_VERSION}), regenerating...`);
                timeline = null;
              } else {
                logger.info(`Cache hit for timeline: ${trimmedName} (version ${timeline.version})`);
              }
            }
          }
        } catch (error) {
          logger.warn('Cache read error:', error);
        }

        // Generate new timeline if no cache or version mismatch
        if (!timeline) {
          try {
            // Use decoded name for Wikipedia API
            logger.info("Fetching wiki page for:", trimmedName);
            
            const page = await wiki.page(trimmedName);
            const [content, summary] = await Promise.all([
              page.content(),
              page.summary()
            ]);

            try {
              timeline = await generateTimeline(trimmedName, content, summary.extract, genAI);
            } catch (error) {
              logger.error('Error generating timeline:', error);
              failedPages.push(trimmedName);
              return;
            }
            
            if (timeline) {
              await redis.set(cacheKey, { timeline });
              logger.info(`Cached new timeline for ${trimmedName} (version ${timeline.version})`);
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

        // Check if we have enough events
        if (!timeline || timeline.events.length < MIN_NUM_EVENTS_FOR_TIMELINE) {
          logger.warn(`Not enough events for ${trimmedName}: ${timeline?.events.length || 0} events`);
          noTimelinePages.push(trimmedName);
          return;
        }

        // Get wiki summary data
        const summaryData = await getCachedWikiSummary(trimmedName);
        
        // Create proper WikiSummary object
        const wikiSummary: WikiSummary = {
          pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(trimmedName)}`,
          thumbnail: summaryData.thumbnail
        };

        
        timelines[trimmedName] = {
          timeline,
          wikiSummary
        };
      })
    );

    // Prepare the response with correct type
    const response: TimelineAPIResponse = {
      timelines,
      errors: failedPages.length > 0 || noTimelinePages.length > 0 ? {
        message: `Could not generate timeline for some pages`,
        failedPages: [...failedPages, ...noTimelinePages],
        details: {
          noWikipediaData: failedPages,
          noTimelineGenerated: noTimelinePages
        }
      } : undefined
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    logger.error('Error in timeline API:', error);
    return new Response(JSON.stringify({ 
      timelines: {},
      errors: {
        message: 'Failed to generate timeline',
        failedPages: []
      }
    } as TimelineAPIResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 