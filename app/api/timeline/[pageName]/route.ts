import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, Timeline, TimelineWithWikiSummary, TimelineEvent } from '@/app/types/timeline';
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

function filterTimelineOutliers(timeline: Timeline, scaleFactor: number = 20): Timeline {
  if (!timeline.events || timeline.events.length <= 5) {
    return timeline; // Not enough events to filter
  }

  // Convert all dates to numerical years
  const years = timeline.events.map(event => {
    const date = event.startDate;
    const year = parseInt(date.startsWith('-') ? date.slice(1) : date.split('-')[0]) * 
                (date.startsWith('-') ? -1 : 1);
    return { year, event };
  });
  
  // Sort by year
  years.sort((a, b) => a.year - b.year);
  
  // Calculate median year
  const medianYear = years[Math.floor(years.length / 2)].year;
  
  // Calculate Median Absolute Deviation (MAD)
  const deviations = years.map(y => Math.abs(y.year - medianYear));
  deviations.sort((a, b) => a - b);
  const medianDeviation = deviations[Math.floor(deviations.length / 2)];
  
  // Calculate threshold (adjust scaleFactor to control sensitivity)
  const threshold = scaleFactor * medianDeviation;
  
  logger.info(`Timeline outlier detection: median year=${medianYear}, MAD=${medianDeviation}, threshold=${threshold}`);
  
  // Filter events
  const filteredEvents = timeline.events.filter(event => {
    const date = event.startDate;
    const year = parseInt(date.startsWith('-') ? date.slice(1) : date.split('-')[0]) * 
                (date.startsWith('-') ? -1 : 1);
    
    const isWithinThreshold = Math.abs(year - medianYear) <= threshold;
    
    if (!isWithinThreshold) {
      logger.info(`Filtered outlier event: ${year} - ${event.headline}`);
    }
    
    return isWithinThreshold;
  });
  
  logger.info(`Filtered ${timeline.events.length - filteredEvents.length} outlier events out of ${timeline.events.length} total`);
  
  return {
    ...timeline,
    events: filteredEvents,
    // Store original event count for reference
    _meta: {
      ...(timeline._meta || {}),
      originalEventCount: timeline.events.length,
      filteredEventCount: filteredEvents.length
    }
  };
}

function postProcessTimeline(timeline: Timeline): Timeline {
  const isValidDate = (date: string) => !isNaN(new Date(date).getTime());
  const isPerson = timeline.birthDate && isValidDate(timeline.birthDate);
  
  // Sort and deduplicate events, but don't filter outliers here
  return {
    ...timeline,
    events: timeline.events
      .sort((a, b) => compareDates(a.startDate, b.startDate))
      .filter((event, index, self) => 
        index === self.findIndex(e => 
          e.startDate === event.startDate && 
          e.headline === event.headline
        )
      )
      .map(event => {
        if (isPerson && timeline.birthDate) {
          const age = calculateAge(timeline.birthDate, event.startDate);
          if (age !== null && age >= 0) {
            if (!timeline.deathDate || compareDates(event.startDate, timeline.deathDate) <= 0) {
              return { ...event, age };
            }
          }
        }
        return event;
      }),
    lastUpdatedAt: Date.now(),
    isDead: Boolean(timeline.deathDate && compareDates(timeline.deathDate, new Date().toISOString().split('T')[0]) <= 0),
    version: CURRENT_PROMPT_VERSION
  };
}

// Add this function near the top of the file, after the imports
function attemptToRepairTruncatedJSON(jsonString: string): any {
  try {
    // First try to parse as is
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn(`JSON parsing failed: ${(error as Error).message}`);
    logger.debug(`Attempting to repair truncated JSON of length ${jsonString.length}`);
    
    // Try to find the last complete event object
    const timelineMatch = jsonString.match(/"timeline"\s*:\s*{/);
    if (!timelineMatch) {
      logger.error('Could not find timeline object in JSON');
      throw new Error('Could not find timeline object in JSON');
    }
    
    // Find the events array
    const eventsMatch = jsonString.match(/"events"\s*:\s*\[/);
    if (!eventsMatch) {
      logger.warn('No events array found, returning minimal JSON');
      const minimalJSON = '{"timeline":{"events":[],"isComplete":false}}';
      return JSON.parse(minimalJSON);
    }
    
    // Find the position of the events array
    const eventsStartPos = eventsMatch.index! + eventsMatch[0].length;
    
    // Extract the content up to the events array start
    const preEventsContent = jsonString.substring(0, eventsStartPos);
    
    // Find all complete event objects
    const eventObjects = [];
    let bracketCount = 0;
    let squareBracketCount = 0;
    let inQuotes = false;
    let escapeNext = false;
    let currentEventStart = eventsStartPos;
    let insideEvent = false;
    
    for (let i = eventsStartPos; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inQuotes = !inQuotes;
        continue;
      }
      
      if (!inQuotes) {
        if (char === '{') {
          bracketCount++;
          if (bracketCount === 1 && squareBracketCount === 0) {
            currentEventStart = i;
            insideEvent = true;
          }
        } else if (char === '}') {
          bracketCount--;
          if (bracketCount === 0 && insideEvent) {
            // We found a complete event object
            const eventObj = jsonString.substring(currentEventStart, i + 1);
            try {
              // Verify it's valid JSON
              JSON.parse(eventObj);
              eventObjects.push(eventObj);
              insideEvent = false;
            } catch (e) {
              // Skip invalid event objects
              logger.debug(`Skipping invalid event object: ${eventObj.substring(0, 50)}...`);
              insideEvent = false;
            }
          }
        } else if (char === '[') {
          squareBracketCount++;
        } else if (char === ']') {
          squareBracketCount--;
          // If we found the end of the events array, we're done
          if (squareBracketCount === -1 && !insideEvent) {
            break;
          }
        }
      }
    }
    
    logger.info(`Found ${eventObjects.length} complete event objects during JSON repair`);
    
    // Construct a valid JSON with the complete events
    let repairedJSON;
    
    // Check if we found the end of the events array
    if (jsonString.indexOf('],"isComplete"') > eventsStartPos) {
      // Try to extract the complete JSON structure
      const endOfEventsArray = jsonString.indexOf('],"isComplete"');
      const postEventsContent = jsonString.substring(endOfEventsArray);
      
      // Check if we have a complete closing structure
      if (postEventsContent.includes('}}')) {
        repairedJSON = `${preEventsContent}${eventObjects.join(',')}${postEventsContent}`;
        logger.debug('Using complete JSON structure with post-events content');
      } else {
        repairedJSON = `${preEventsContent}${eventObjects.join(',')}],"isComplete":false}}`;
        logger.debug('Using partial JSON structure with manually added closing');
      }
    } else {
      repairedJSON = `${preEventsContent}${eventObjects.join(',')}],"isComplete":false}}`;
      logger.debug('Using basic JSON structure with manually added closing');
    }
    
    try {
      const result = JSON.parse(repairedJSON);
      logger.info(`Successfully repaired JSON with ${result.timeline.events.length} events`);
      return result;
    } catch (e) {
      // If repair failed, try a simpler approach
      logger.error(`Complex JSON repair failed: ${(e as Error).message}`);
      
      try {
        // Just extract the events and create a minimal structure
        const validEvents = eventObjects.filter(eventStr => {
          try {
            JSON.parse(eventStr);
            return true;
          } catch {
            return false;
          }
        });
        
        const simpleJSON = `{"timeline":{"events":[${validEvents.join(',')}],"isComplete":false}}`;
        const result = JSON.parse(simpleJSON);
        logger.info(`Fallback repair successful with ${result.timeline.events.length} events`);
        return result;
      } catch (e2) {
        // If all else fails, return minimal valid JSON
        logger.error(`All JSON repair attempts failed: ${(e2 as Error).message}`);
        return JSON.parse('{"timeline":{"events":[],"isComplete":false}}');
      }
    }
  }
}

// Add this function to split content into chunks
function splitContentIntoChunks(content: string, maxChunks: number = 3): string[] {
  if (!content || content.length === 0) {
    return [''];
  }
  
  // If content is small enough, return it as a single chunk
  if (content.length < 10000 || maxChunks <= 1) {
    return [content];
  }
  
  const chunkSize = Math.ceil(content.length / maxChunks);
  const chunks: string[] = [];
  
  // Try to split at paragraph boundaries
  let startPos = 0;
  for (let i = 1; i < maxChunks; i++) {
    const targetPos = i * chunkSize;
    
    // Look for paragraph breaks near the target position
    let breakPos = content.indexOf('\n\n', targetPos - 500);
    if (breakPos === -1 || breakPos > targetPos + 500) {
      // If no paragraph break found, look for sentence end
      breakPos = content.indexOf('. ', targetPos - 200);
      if (breakPos === -1 || breakPos > targetPos + 200) {
        // If no good break found, just split at the target position
        breakPos = targetPos;
      } else {
        breakPos += 2; // Include the period and space
      }
    } else {
      breakPos += 2; // Include the newlines
    }
    
    chunks.push(content.substring(startPos, breakPos));
    startPos = breakPos;
  }
  
  // Add the last chunk
  chunks.push(content.substring(startPos));
  
  return chunks;
}

async function generateTimeline(
  pageName: string, 
  wikiContent: string, 
  genAI: GoogleGenerativeAI
): Promise<Timeline | null> {
  // Only use the incremental approach
  return generateTimelineIncrementally(pageName, wikiContent, genAI);
}

async function generateTimelineIncrementally(
  pageName: string,
  wikiContent: string,
  genAI: GoogleGenerativeAI,
  maxRounds: number = 3
): Promise<Timeline> {
  let allEvents: TimelineEvent[] = [];
  let isComplete = false;
  let round = 0;
  let title = pageName;
  let birthDate: string | undefined;
  let deathDate: string | undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let contentChunks = [wikiContent];
  let currentChunkIndex = 0;
  let truncationOccurred = false;
  let consecutiveTruncations = 0;
  
  logger.info(`Starting incremental timeline generation for ${pageName}`);
  
  while (!isComplete && round < maxRounds) {
    round++;
    logger.info(`Incremental generation round ${round} of ${maxRounds}`);
    
    // Get the current content chunk
    let contentChunk = contentChunks[currentChunkIndex];
    
    // If truncation occurred in the previous round, try different strategies
    if (truncationOccurred) {
      consecutiveTruncations++;
      
      if (consecutiveTruncations === 1) {
        // On first truncation, try reducing the current chunk size
        if (contentChunk.length > 5000) {
          const newLength = Math.floor(contentChunk.length * 0.7); // Reduce by 30%
          contentChunk = contentChunk.substring(0, newLength);
          contentChunks[currentChunkIndex] = contentChunk;
          logger.info(`Reduced content size to ${contentChunk.length} characters due to truncation`);
        }
      } else if (consecutiveTruncations === 2) {
        // On second truncation, try splitting the content into multiple chunks
        if (contentChunks.length === 1 && contentChunk.length > 10000) {
          contentChunks = splitContentIntoChunks(wikiContent);
          currentChunkIndex = 0;
          contentChunk = contentChunks[currentChunkIndex];
          logger.info(`Split content into ${contentChunks.length} chunks due to persistent truncation`);
        }
      } else {
        // On third or more truncation, move to the next chunk if available
        if (currentChunkIndex < contentChunks.length - 1) {
          currentChunkIndex++;
          contentChunk = contentChunks[currentChunkIndex];
          logger.info(`Moving to next content chunk (${currentChunkIndex + 1}/${contentChunks.length})`);
          consecutiveTruncations = 0; // Reset counter for the new chunk
        } else if (contentChunk.length > 3000) {
          // If we're already at the last chunk, reduce size more aggressively
          const newLength = Math.floor(contentChunk.length * 0.5); // Reduce by 50%
          contentChunk = contentChunk.substring(0, newLength);
          contentChunks[currentChunkIndex] = contentChunk;
          logger.info(`Aggressively reduced content size to ${contentChunk.length} characters due to persistent truncation`);
        } else {
          logger.warn(`Content already reduced to ${contentChunk.length} characters, cannot reduce further`);
        }
      }
      
      truncationOccurred = false;
    }
    
    // Create system instruction based on round number
    const systemInstruction = getSystemInstruction(round === 1);
    
    // Simple user prompt focused only on the article and existing events
    const userPrompt = `
      Create a timeline for ${JSON.stringify(pageName.trim())}.
      Main content to extract events from: ${JSON.stringify(contentChunk)}
      ${contentChunks.length > 1 ? `(This is part ${currentChunkIndex + 1} of ${contentChunks.length})` : ''}
      
      ${allEvents.length > 0 ? `I already have ${allEvents.length} events. Here they are: ${JSON.stringify(allEvents)}` : ''}
      
      ${consecutiveTruncations > 0 ? 'IMPORTANT: Keep your response concise to avoid truncation. Extract only the most important events.' : ''}
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
      
      // Log token usage for this round - safely access properties that might not exist
      const usageMetadata = response.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount || 0;
      const outputTokens = usageMetadata?.candidatesTokenCount || 0;
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      
      logger.debug(`Round ${round} token usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
      
      // Check if response was truncated
      const wasMaxTokensReached = response.candidates?.[0]?.finishReason === 'MAX_TOKENS';
      if (wasMaxTokensReached) {
        logger.warn(`MAX_TOKENS reached in round ${round}, attempting to repair truncated JSON`);
        truncationOccurred = true;
      }
      
      // Use the repair function to handle potentially truncated JSON
      let data;
      try {
        data = attemptToRepairTruncatedJSON(response.text());
        logger.info(`Successfully parsed JSON response${truncationOccurred ? ' after repair' : ''}`);
      } catch (error) {
        logger.error(`Failed to parse JSON response: ${error}`);
        
        // If we have events already, continue with what we have
        if (allEvents.length > 0) {
          logger.info(`Continuing with ${allEvents.length} events collected so far`);
          isComplete = true; // Force completion
          break;
        } else if (contentChunks.length > 1 && currentChunkIndex < contentChunks.length - 1) {
          // If we have multiple chunks and this one failed, try the next chunk
          currentChunkIndex++;
          logger.info(`Moving to next content chunk (${currentChunkIndex + 1}/${contentChunks.length}) after parse failure`);
          continue;
        } else {
          throw error; // Propagate error if we have no events yet and no more chunks
        }
      }
      
      // Extract the timeline data
      const fragment = data.timeline;
      
      // Save metadata from the first round
      if (round === 1) {
        title = fragment.title || pageName;
        birthDate = fragment.birthDate;
        deathDate = fragment.deathDate;
      }
      
      // Add new events to our collection
      const newEvents = fragment.events || [];
      
      // Deduplicate events before adding
      const existingHeadlines = new Set(allEvents.map(e => e.headline));
      const uniqueNewEvents = newEvents.filter((event: TimelineEvent) => !existingHeadlines.has(event.headline));
      
      allEvents = [...allEvents, ...uniqueNewEvents];
      
      // If we have multiple chunks, only mark as complete when we've processed all chunks
      if (contentChunks.length > 1 && currentChunkIndex < contentChunks.length - 1) {
        isComplete = false;
        currentChunkIndex++; // Move to next chunk
        logger.info(`Moving to next content chunk (${currentChunkIndex + 1}/${contentChunks.length})`);
      } else {
        isComplete = truncationOccurred ? false : (fragment.isComplete || false);
      }
      
      logger.info(`Round ${round}: Added ${uniqueNewEvents.length} events (${newEvents.length - uniqueNewEvents.length} duplicates filtered). Total: ${allEvents.length}. Complete: ${isComplete}`);
      
      // If no new events were added and we're not complete, something might be wrong
      if (uniqueNewEvents.length === 0 && !isComplete && round < maxRounds) {
        if (contentChunks.length > 1 && currentChunkIndex < contentChunks.length - 1) {
          // If we have multiple chunks and this one didn't add events, try the next chunk
          currentChunkIndex++;
          logger.info(`Moving to next content chunk (${currentChunkIndex + 1}/${contentChunks.length}) after no new events`);
        } else {
          logger.warn(`No new events added in round ${round}, but isComplete is false. Continuing anyway.`);
        }
      }
      
      // If we have a lot of events already, we might want to stop early
      if (allEvents.length > 100) {
        logger.info(`Already have ${allEvents.length} events, marking as complete to avoid excessive processing`);
        isComplete = true;
      }
    } catch (error) {
      logger.error(`Error in incremental generation round ${round}:`, error);
      
      // If we have some events already, we'll return what we have
      if (allEvents.length > 0) {
        logger.info(`Returning ${allEvents.length} events collected so far despite error`);
        isComplete = true; // Force completion
      } else if (contentChunks.length > 1 && currentChunkIndex < contentChunks.length - 1) {
        // If we have multiple chunks and this one failed, try the next chunk
        currentChunkIndex++;
        logger.info(`Moving to next content chunk (${currentChunkIndex + 1}/${contentChunks.length}) after error`);
        continue;
      } else {
        // If first round failed completely and we have no more chunks, propagate the error
        throw error;
      }
    }
  }
  
  // Log total token usage for all rounds
  logger.debug(`Total token usage for ${pageName}: ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalInputTokens + totalOutputTokens} total tokens`);
  
  // If we've reached max rounds but aren't complete, log a warning
  if (!isComplete && round >= maxRounds) {
    logger.warn(`Reached maximum rounds (${maxRounds}) without completing timeline. Returning ${allEvents.length} events.`);
  }
  
  // Construct the final timeline
  const timeline = {
    title,
    birthDate,
    deathDate,
    events: allEvents,
  };
  
  // Post-process the timeline
  return postProcessTimeline(timeline);
}

// Helper function to get the appropriate system instruction based on round
function getSystemInstruction(isFirstRound: boolean): string {
  return `
You are a timeline generator that extracts events from provided Wikipedia article content. 
Your task is to carefully read through the provided article text and identify ALL events that have associated dates and are directly related to the subject.

Output JSONFormat:
{
  "timeline": {
    ${isFirstRound ? `"title": "Concise description stating subject's name, years (if known), nationality/background, and primary significance. For events/periods, state what it is and its historical importance. For BCE dates, use BCE instead of negative years.",
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
    "isComplete": true/false
  }
}

IMPORTANT INSTRUCTIONS FOR INCREMENTAL GENERATION:
1. ${isFirstRound ? 'Extract ALL events with explicit dates from the article.' : 'Continue extracting events that are NOT in the list provided in the prompt.'}
2. If you're approaching the output token limit, stop adding events and set "isComplete": false.
3. If you've extracted all possible events with dates from the article, set "isComplete": true.
4. Always return valid JSON matching the specified schema, even if you need to truncate your response.
5. Include ALL events with explicit dates, regardless of their perceived importance.

ACCURACY IS THE TOP PRIORITY:
- Only extract events that have explicit dates mentioned in the article
- For dates before year 0 (BCE/BC), use negative years (e.g., '-0221' for 221 BCE)
- Do not include events or dates from your training data - only use what's in the provided article
- If a date appears in the text but is ambiguous or seems incorrect, exclude it
- If the article contains no dated events, return an empty array and set isComplete to true
- For date ranges:
  * Always create a single event using the start date
  * Include the end date in the event description
  * Use clear language like "from [start] to [end]" or "between [start] and [end]"
- Always include the full date in the event description for context
- Never make up events or dates - only include what's explicitly mentioned in the article

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
- Duplicate events with identical information

${isFirstRound ? 'For the first round, make sure to include title, birthDate, and deathDate if available in the article.' : 'For this continuation round, focus only on extracting new events not already in the provided list.'}
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
            const content = await page.content();

            try {
              timeline = await generateTimeline(trimmedName, content, genAI);
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

        // Check if timeline is empty
        if (!timeline?.events?.length || timeline.events.length < MIN_NUM_EVENTS_FOR_TIMELINE) {
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

    // Apply filtering to the response if requested
    if (filterOutliers) {
      Object.keys(timelines).forEach(pageName => {
        const originalTimeline = timelines[pageName].timeline;
        // Create a deep copy to avoid modifying the original
        const filteredTimeline = filterTimelineOutliers({
          ...originalTimeline,
          events: [...originalTimeline.events]
        }, scaleFactor);
        
        // Replace with filtered timeline
        timelines[pageName].timeline = filteredTimeline;
      });
      
      logger.info('Applied outlier filtering to API response');
    }

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