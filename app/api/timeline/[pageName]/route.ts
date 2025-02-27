import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, Timeline, TimelineWithWikiSummary, TimelineEvent } from '@/app/types/timeline';
import { MIN_NUM_EVENTS_FOR_TIMELINE, PAGE_DELIMITER } from "@/app/constants";
import { unstable_cache } from 'next/cache';
import { SITE_CONFIG } from "@/app/config/site";
import { INCREMENTAL_TIMELINE_SCHEMA } from "@/app/constants/gemini/timelineSchema";
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
  
  logger.info(`Starting incremental timeline generation for ${pageName}`);
  
  while (!isComplete && round < maxRounds) {
    round++;
    logger.info(`Incremental generation round ${round} of ${maxRounds}`);
    
    // Combined prompt with system instructions
    const prompt = `
      You are a timeline generator that extracts events from provided Wikipedia article content. 
      Your task is to carefully read through the provided article text and identify ALL events that have associated dates and are directly related to the subject.
      
      Create a timeline for ${JSON.stringify(pageName.trim())}.
      Main content to extract events from: ${JSON.stringify(wikiContent)}
      
      ${allEvents.length > 0 ? `I already have ${allEvents.length} events. Here they are: ${JSON.stringify(allEvents)}` : ''}
      
      IMPORTANT INSTRUCTIONS:
      1. ${allEvents.length > 0 ? 'Continue extracting events that are NOT in the list above.' : 'Extract ALL events with explicit dates.'}
      2. If you're approaching the output token limit, stop adding events and set "isComplete": false.
      3. If you've extracted all events with dates from the article, set "isComplete": true.
      4. Always return valid JSON matching the specified schema.
      5. Include ALL events with explicit dates, not just the most significant ones.
      
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
      
      Do not include:
      - Events without clear dates
      - Events not directly related to the subject
      - Dates from referenced works or citations
      - Future dates or predictions
      - Duplicate events with identical information
    `;
    
    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: INCREMENTAL_TIMELINE_SCHEMA,
      },
      safetySettings: SAFETY_SETTINGS
      // Removed system instruction parameter
    });
    
    try {
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      
      // Check if response was truncated
      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        logger.warn(`MAX_TOKENS reached in round ${round}, but we'll still try to parse the response`);
      }
      
      const data = JSON.parse(response.text());
      
      // Extract the timelineFragment
      const fragment = data.timelineFragment;
      
      // Save metadata from the first round
      if (round === 1) {
        title = fragment.title;
        birthDate = fragment.birthDate;
        deathDate = fragment.deathDate;
      }
      
      // Add new events to our collection
      const newEvents = fragment.events || [];
      
      // Deduplicate events before adding
      const existingHeadlines = new Set(allEvents.map(e => e.headline));
      const uniqueNewEvents = newEvents.filter((event: TimelineEvent) => !existingHeadlines.has(event.headline));
      
      allEvents = [...allEvents, ...uniqueNewEvents];
      isComplete = fragment.isComplete;
      
      logger.info(`Round ${round}: Added ${uniqueNewEvents.length} events (${newEvents.length - uniqueNewEvents.length} duplicates filtered). Total: ${allEvents.length}. Complete: ${isComplete}`);
      
      // If no new events were added and we're not complete, something might be wrong
      if (uniqueNewEvents.length === 0 && !isComplete && round < maxRounds) {
        logger.warn(`No new events added in round ${round}, but isComplete is false. Continuing anyway.`);
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
      } else {
        // If first round failed completely, propagate the error
        throw error;
      }
    }
  }
  
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