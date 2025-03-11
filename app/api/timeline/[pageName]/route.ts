import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, Timeline, TimelineWithWikiSummary, TimelineEvent, WikiSummary } from '@/app/types/timeline';
import { 
  PAGE_DELIMITER, 
  DEFAULT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  PAGE_NAME_SEPARATOR,
  DEFAULT_LANGUAGE,
  FORCE_REGENERATE_ON_VERSION_MISMATCH,
  DEFAULT_MODEL,
  DEFAULT_TIMELINE_VERSION
} from "@/app/constants";
import { unstable_cache } from 'next/cache';
import { SITE_CONFIG } from "@/app/config/site";
import { TIMELINE_SCHEMA } from "@/app/constants/gemini/timelineSchema";
import { SAFETY_SETTINGS } from "@/app/constants/gemini/safetySettings";
import { TEMPERATURE } from "@/app/constants/gemini";
import { SYSTEM_PROMPT } from "@/app/constants/gemini/systemPrompt";
import { compareDates } from "@/app/utils/helper";

// Initialize Redis
const redis = Redis.fromEnv();

// Initialize Wikipedia with User-Agent
const userAgent = `WikiTimeline/1.0.0 (${SITE_CONFIG.DOMAIN}; ${SITE_CONFIG.CONTACT_EMAIL})`;
wiki.setUserAgent(userAgent);
logger.debug('Wikipedia User-Agent set:', userAgent);

// Add the NewTimelineFormat interface
interface NewTimelineFormat {
  timeline: Timeline;
}

// Interface for language and page name
interface PageInfo {
  language: string;
  pageName: string;
  original: string;
}

// Parse a page name with optional language prefix
function parsePageName(rawName: string): PageInfo {
  const trimmedName = rawName.trim();
  
  // Check if there's a language prefix (e.g., "en:::Page_Name")
  const separator = PAGE_NAME_SEPARATOR;
  const separatorIndex = trimmedName.indexOf(separator);
  
  if (separatorIndex > 0) {
    const language = trimmedName.substring(0, separatorIndex);
    const pageName = trimmedName.substring(separatorIndex + separator.length);
    
    return {
      language,
      pageName,
      original: trimmedName
    };
  }
  
  // No language specified or invalid language, use default
  return {
    language: DEFAULT_LANGUAGE,
    pageName: trimmedName,
    original: trimmedName
  };
}

// Function to construct cache key
function buildCacheKey(pageInfo: PageInfo, apiVersion: string = DEFAULT_API_VERSION): string {
  // Validate the API version
  const validatedVersion = validateApiVersion(apiVersion);
  return `timeline|${validatedVersion}|${pageInfo.language}|${pageInfo.pageName}`;
}

// Function to validate and normalize API version
function validateApiVersion(requestedVersion: string | null): string {
  if (!requestedVersion) {
    return DEFAULT_API_VERSION;
  }
  
  if (SUPPORTED_API_VERSIONS.includes(requestedVersion)) {
    return requestedVersion;
  }
  
  // If unsupported version, fall back to default
  logger.warn(`Unsupported API version requested: ${requestedVersion}, using default: ${DEFAULT_API_VERSION}`);
  return DEFAULT_API_VERSION;
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
      version: DEFAULT_TIMELINE_VERSION,
      lastUpdatedAt: Date.now()
    };
  }

  // Sort events by date using compareDates function to properly handle negative years
  const sortedEvents = [...timeline.events].sort((a, b) => {
    const aDate = a.startDate || '';
    const bDate = b.startDate || '';
    return compareDates(aDate, bDate);
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
          const existingDate = existingEvent.startDate;
          const currentDate = event.startDate;
          
          // Use a simple year comparison for dates that might be BCE
          const existingYear = parseInt(existingDate.startsWith('-') ? existingDate.slice(1) : existingDate.split('-')[0]) * (existingDate.startsWith('-') ? -1 : 1);
          const currentYear = parseInt(currentDate.startsWith('-') ? currentDate.slice(1) : currentDate.split('-')[0]) * (currentDate.startsWith('-') ? -1 : 1);
          
          if (Math.abs(existingYear - currentYear) <= 1) {
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
    uniqueEvents.forEach(event => {
      // Only calculate age if event date is after birth date
      if (compareDates(event.startDate, timeline.birthDate!) >= 0) {
        // If death date exists, only calculate age if event date is before or equal to death date
        if (!timeline.deathDate || compareDates(event.startDate, timeline.deathDate) <= 0) {
          const age = calculateAge(timeline.birthDate!, event.startDate);
          if (age !== null && age >= 0) {
            // Add age as a separate field
            event.age = age;
          }
        }
      }
    });
  }

  // Return the processed timeline with version
  return {
    ...timeline,
    events: uniqueEvents,
    version: DEFAULT_TIMELINE_VERSION,
    lastUpdatedAt: Date.now()
  };
}

// Modified function to generate timeline using parallel chunk processing
async function generateTimeline(
  pageName: string, 
  wikiContent: string,
  genAI: GoogleGenerativeAI,
  language: string = DEFAULT_LANGUAGE,
): Promise<Timeline | null> {
  try {
    logger.debug(`Generating timeline for ${pageName} (language: ${language})`);
    
    // Create the Gemini model with the appropriate settings
    const geminiModel = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        maxOutputTokens: 8192, // Use maximum available tokens
        temperature: TEMPERATURE,
      },
    });
    
    // Track accumulated results and conversation
    let accumulatedResult = "";
    let iterations = 0;
    const MAX_ITERATIONS = 3;
    
    // Initialize conversation with system message and user content
    let conversation = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: "I'll extract events from the Wikipedia content you provide." }] },
      { role: 'user', parts: [{ text: `Create a timeline for: ${pageName}\n\n${wikiContent}` }] }
    ];
    
    while (iterations < MAX_ITERATIONS) {
      // Call Gemini with the conversation history
      logger.debug(`Calling Gemini (iteration ${iterations + 1}/${MAX_ITERATIONS})`);
      
      const response = await geminiModel.generateContent({
        contents: conversation,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: TEMPERATURE,
        }
      });
      
      // Get text response
      const textResponse = response.response.text();
      
      // Add this response to our accumulated result
      accumulatedResult += textResponse;
      
      // Log debugging info
      logger.debug(`Response finish reason: ${response.response.candidates?.[0]?.finishReason}`);
      
      // Check if response was truncated due to token limits
      const finishReason = response.response.candidates?.[0]?.finishReason;
      
      if (finishReason === 'MAX_TOKENS' && iterations < MAX_ITERATIONS - 1) {
        logger.info(`MAX_TOKENS reached in iteration ${iterations + 1}, continuing...`);
        
        // Add the model's response to the conversation and ask it to continue
        conversation.push({ role: 'model', parts: [{ text: textResponse }] });
        conversation.push({ 
          role: 'user', 
          parts: [{ 
            text: "Your response was cut off due to token limits. Please continue from where you left off. Remember to focus on producing valid JSON that can be merged with your previous output." 
          }]
        });
        
        iterations++;
      } else {
        // Either we finished successfully or reached our iteration limit
        break;
      }
    }
    
    // Try to parse the result as JSON
    try {
      // Some cleanup to ensure we have valid JSON
      let jsonString = accumulatedResult.trim();
      
      // If the response starts with markdown code block indicators, strip them
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.replace(/```json\n/, "").replace(/\n```$/, "");
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/```\n/, "").replace(/\n```$/, "");
      }
      
      // Log the JSON string for debugging
      logger.debug(`Attempting to parse JSON: ${jsonString.substring(0, 100)}...`);
      
      // Attempt to parse the JSON
      const data = JSON.parse(jsonString);
      const timelineData = data.timeline;
      
      // Build the timeline
      const timeline: Timeline = {
        title: timelineData.title || pageName,
        events: timelineData.events || [],
        birthDate: timelineData.birthDate,
        deathDate: timelineData.deathDate,
      };
      
      // Post-process the timeline
      const processedTimeline = postProcessTimeline(timeline);
      
      return processedTimeline.events.length > 0 ? processedTimeline : null;
    } catch (jsonError) {
      logger.error("Failed to parse JSON from response", jsonError);
      logger.error("Raw response:", accumulatedResult);
      return null;
    }
  } catch (error) {
    logger.error(`Failed to generate timeline for ${pageName}:`, error);
    return null;
  }
}

// Cache the wiki summary with language support
const getCachedWikiSummary = unstable_cache(
  async (pageInfo: PageInfo) => {
    try {
      // Set the Wikipedia API to use the correct language
      wiki.setLang(pageInfo.language);
      
      const summary = await wiki.summary(pageInfo.pageName);
      return {
        canonicalTitle: summary.titles.canonical,
        thumbnail: summary.thumbnail?.source,
        pageUrl: summary.content_urls?.desktop?.page || `https://${pageInfo.language}.wikipedia.org/wiki/${encodeURIComponent(pageInfo.pageName)}`
      };
    } catch (error) {
      logger.warn(`Could not fetch wiki summary for ${pageInfo.language}:${pageInfo.pageName}, using fallback:`, error);
      return {
        canonicalTitle: pageInfo.pageName,
        thumbnail: undefined,
        pageUrl: `https://${pageInfo.language}.wikipedia.org/wiki/${encodeURIComponent(pageInfo.pageName)}`
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

// Helper function to fetch Wikipedia content
async function fetchWikipediaContent(pageInfo: PageInfo): Promise<{content: string, summary: string} | null> {
  try {
    // Set wiki to the correct language
    wiki.setLang(pageInfo.language);
    
    logger.debug(`Fetching wiki page for ${pageInfo.language}:${pageInfo.pageName}`);
    
    const page = await wiki.page(pageInfo.pageName);
    const [content, summary] = await Promise.all([
      page.content(),
      page.summary()
    ]);
    
    return {
      content,
      summary: summary.extract
    };
  } catch (error) {
    logger.error(`Error fetching Wikipedia content for ${pageInfo.language}:${pageInfo.pageName}:`, error);
    return null;
  }
}

// Update the GET handler to support language prefixes
export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
): Promise<Response> {
  const clientType = request.headers.get('x-internal-client-type');
  const requestedApiVersion = request.headers.get('x-api-version');
  const apiVersion = validateApiVersion(requestedApiVersion);
  const genAI = getGeminiClient(clientType);
    
  try {
    // First decode the URL parameters
    const rawPageNames = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .map(name => name.trim())
      .filter(Boolean);
      
    // Parse each page name to extract language and actual page name
    const pageInfos = rawPageNames.map(parsePageName);
    
    logger.info(`Processing ${pageInfos.length} pages with API version ${apiVersion}`);
    logger.debug(`Page info details: ${JSON.stringify(pageInfos.map(p => `${p.language}:${p.pageName}`))}`);
    
    // Get canonical names first
    const canonicalInfos = await Promise.all(
      pageInfos.map(async (pageInfo) => {
        const summary = await getCachedWikiSummary(pageInfo);
        if (summary.canonicalTitle !== pageInfo.pageName) {
          logger.info(`Redirecting ${pageInfo.language}:${pageInfo.pageName} to canonical title: ${summary.canonicalTitle}`);
        }
        
        return {
          ...pageInfo,
          pageName: summary.canonicalTitle
        };
      })
    );

    const failedPages: string[] = [];
    const noTimelinePages: string[] = [];
    const timelines: Record<string, TimelineWithWikiSummary> = {};

    await Promise.all(
      canonicalInfos.map(async (pageInfo) => {
        // Use the language and page name for the cache key
        const cacheKey = buildCacheKey(pageInfo, apiVersion);
        
        // Try to get cached timeline
        let timeline: Timeline | null = null;
        
        try {
          const cached = await redis.get(cacheKey);
          if (cached && typeof cached === 'object') {
            const cachedData = cached as NewTimelineFormat;
            timeline = cachedData.timeline;
            
            // Check version match
            if (timeline && timeline.version !== DEFAULT_TIMELINE_VERSION && FORCE_REGENERATE_ON_VERSION_MISMATCH) {
              logger.info(`Cache version mismatch for ${pageInfo.language}:${pageInfo.pageName} (${timeline.version} vs ${DEFAULT_TIMELINE_VERSION}), regenerating...`);
              timeline = null;
            } else if (timeline) {
              logger.info(`Using cached timeline for ${pageInfo.language}:${pageInfo.pageName} (${timeline.version})`);
            }
          }
          
          // If not in cache or version mismatch, generate it
          if (!timeline) {
            logger.info(`Generating new timeline for ${pageInfo.language}:${pageInfo.pageName}`);
            
            // Fetch Wikipedia content
            const wikiData = await fetchWikipediaContent(pageInfo);
            
            if (wikiData) {
              timeline = await generateTimeline(
                pageInfo.pageName, 
                wikiData.content,
                genAI,
                pageInfo.language
              );
              
              if (timeline) {
                logger.warn(`Caching timeline for ${pageInfo.language}:${pageInfo.pageName} (${timeline.events.length} events)`);
                
                // Cache with new format that includes the version
                await redis.set(cacheKey, {
                  timeline
                });
              }
            } else {
              logger.warn(`Failed to fetch Wikipedia content for ${pageInfo.language}:${pageInfo.pageName}`);
              failedPages.push(pageInfo.original);
              return;
            }
          }
        } catch (error) {
          logger.error(`Error processing ${pageInfo.language}:${pageInfo.pageName}:`, error);
          failedPages.push(pageInfo.original);
          return;
        }

        if (!timeline) {
          noTimelinePages.push(pageInfo.original);
          return;
        }

        // Get or generate a wiki summary
        let wikiSummary = await getCachedWikiSummary(pageInfo);

        // Store the timeline and wiki summary
        timelines[pageInfo.original] = {
          timeline,
          wikiSummary
        };
      })
    );

    // Create the response
    const response: TimelineAPIResponse = {
      timelines,
      apiVersion,
      errors: failedPages.length > 0 || noTimelinePages.length > 0 ? {
        message: "Some pages failed to generate timelines",
        failedPages,
        details: {
          noWikipediaData: failedPages,
          noTimelineGenerated: noTimelinePages
        }
      } : undefined
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': apiVersion
      }
    });

  } catch (error) {
    logger.error('Error in timeline API:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate timeline',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': apiVersion
        }
      }
    );
  }
} 