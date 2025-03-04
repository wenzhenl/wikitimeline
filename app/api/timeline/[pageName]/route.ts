import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import logger from '@/app/utils/logger';
import { TimelineAPIResponse, Timeline, TimelineWithWikiSummary, TimelineEvent, WikiSummary } from '@/app/types/timeline';
import { 
  MIN_NUM_EVENTS_FOR_TIMELINE, 
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
import { MAX_CHUNK_SIZE, TEMPERATURE } from "@/app/constants/gemini";
import { getSystemInstruction } from "@/app/constants/gemini/systemPrompt";
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
  
  // Check if there's a language prefix (e.g., "en:Page_Name")
  const separator = PAGE_NAME_SEPARATOR;
  const separatorIndex = trimmedName.indexOf(separator);
  
  if (separatorIndex > 0) {
    const language = trimmedName.substring(0, separatorIndex);
    const pageName = trimmedName.substring(separatorIndex + separator.length);
    
    // Validate language code is 2 characters
    if (language.match(/^[a-z]{2}$/)) {
      return {
        language,
        pageName,
        original: trimmedName
      };
    }
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

// Improved function to split content into chunks with better token estimation
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
  
  // Calculate approximate token count for logging
  const estimateTokens = (text: string): number => Math.round(text.length / 3); // ~3 chars per token
  
  while (startPos < content.length) {
    // Calculate end position for this chunk
    let endPos = Math.min(startPos + maxChunkSize, content.length);
    
    // Try to find a paragraph break near the end position
    const paragraphBreak = content.lastIndexOf('\n\n', endPos);
    if (paragraphBreak > startPos && paragraphBreak > endPos - 1500) {
      endPos = paragraphBreak + 2; // Include the newlines
    } else {
      // If no paragraph break, try to find a sentence end
      const sentenceBreak = content.lastIndexOf('. ', endPos);
      if (sentenceBreak > startPos && sentenceBreak > endPos - 600) {
        endPos = sentenceBreak + 2; // Include the period and space
      }
    }
    
    // Add the chunk
    const chunk = content.substring(startPos, endPos);
    chunks.push(chunk);
    
    // Log individual chunk size for debugging
    const chunkTokens = estimateTokens(chunk);
    logger.debug(`Created chunk ${chunks.length}: ${chunk.length} chars, ~${chunkTokens} tokens`);
    
    startPos = endPos;
  }
  
  // Log chunk information
  const avgChunkSize = Math.round(content.length / chunks.length);
  const estimatedTokens = Math.round(avgChunkSize / 3); // Rough estimate: ~3 chars per token
  logger.info(`Split content into ${chunks.length} chunks (avg size: ${avgChunkSize} chars, ~${estimatedTokens} tokens per chunk)`);
  
  // Check if chunks are too small and need to be merged
  if (chunks.length > 1) {
    const smallChunkThreshold = maxChunkSize / 3; // Consider chunks smaller than 1/3 of max size as "small"
    
    // Find small chunks that could be merged
    const mergedChunks: string[] = [];
    let currentMergedChunk = chunks[0];
    let currentMergedSize = chunks[0].length;
    
    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // If this chunk is small or the merged result would still be under max size
      if (chunk.length < smallChunkThreshold || (currentMergedSize + chunk.length) < maxChunkSize) {
        // Merge with previous chunk
        currentMergedChunk += chunk;
        currentMergedSize += chunk.length;
        logger.debug(`Merged chunk ${i+1} into previous chunk (new size: ${currentMergedSize} chars, ~${estimateTokens(currentMergedChunk)} tokens)`);
      } else {
        // Save the current merged chunk and start a new one
        mergedChunks.push(currentMergedChunk);
        currentMergedChunk = chunk;
        currentMergedSize = chunk.length;
      }
    }
    
    // Add the last merged chunk
    mergedChunks.push(currentMergedChunk);
    
    // If we actually merged any chunks, update the chunks array and log
    if (mergedChunks.length < chunks.length) {
      chunks.length = 0; // Clear the array
      chunks.push(...mergedChunks); // Add the merged chunks
      
      const newAvgSize = Math.round(content.length / chunks.length);
      const newEstTokens = Math.round(newAvgSize / 3);
      logger.info(`After merging small chunks: ${chunks.length} chunks (avg size: ${newAvgSize} chars, ~${newEstTokens} tokens per chunk)`);
      
      // Log individual chunk sizes after merging
      chunks.forEach((chunk, idx) => {
        logger.debug(`Final chunk ${idx+1}: ${chunk.length} chars, ~${estimateTokens(chunk)} tokens`);
      });
    }
  }
  
  return chunks;
}

// Modified function to generate timeline using parallel chunk processing
async function generateTimeline(
  pageName: string, 
  wikiContent: string,
  wikiSummary: string,
  genAI: GoogleGenerativeAI,
  language: string = DEFAULT_LANGUAGE,
): Promise<Timeline | null> {
  // Split content into chunks
  const contentChunks = splitContentIntoChunks(wikiContent);
  logger.info(`Processing ${contentChunks.length} chunks for ${pageName}`);
  
  // Process all chunks in parallel
  const chunkResults = await Promise.all(
    contentChunks.map((chunk, index) => 
      processChunk(pageName, chunk, wikiSummary, index, contentChunks.length, genAI, language)
    )
  );
  
  // Collect all events and metadata
  let allEvents: TimelineEvent[] = [];
  let title = pageName;
  let birthDate: string | undefined;
  let deathDate: string | undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  // Track token usage and events per chunk for logging
  const tokensPerChunk: { input: number, output: number }[] = [];
  const eventsPerChunk: number[] = [];
  
  // Process each chunk result
  chunkResults.forEach((result, index) => {
    if (!result) {
      logger.warn(`No result from chunk ${index + 1} for ${pageName}`);
      tokensPerChunk.push({ input: 0, output: 0 });
      eventsPerChunk.push(0);
      return;
    }
    
    // Add events from this chunk
    allEvents = [...allEvents, ...result.events];
    eventsPerChunk.push(result.events.length);
    
    // Add token usage
    tokensPerChunk.push({
      input: result.inputTokens || 0,
      output: result.outputTokens || 0
    });
    
    // Use title from the first chunk if available
    if (index === 0 && result.title) {
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
  
  // Log detailed token usage
  logger.debug(`Token usage by chunk: ${tokensPerChunk.map((tokens, i) => 
    `Chunk ${i+1}: ${tokens.input} input, ${tokens.output} output`).join(', ')}`);
  logger.info(`Total token usage for ${pageName}: ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalInputTokens + totalOutputTokens} total tokens`);
  
  // Log event counts
  logger.info(`Events by chunk: ${eventsPerChunk.map((count, i) => `Chunk ${i+1}: ${count}`).join(', ')}`);
  logger.info(`Total raw events extracted for ${pageName}: ${allEvents.length} (before deduplication)`);
  
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
    events: allEvents
  };
  
  // Post-process the timeline (sorts, deduplicates, and adds ages)
  const processedTimeline = postProcessTimeline(timeline);
  logger.info(`Final timeline for ${pageName} has ${processedTimeline.events.length} unique events (after deduplication)`);
  
  return processedTimeline;
}

// Process an individual chunk of Wikipedia content
async function processChunk(
  pageName: string,
  chunkContent: string,
  wikiSummary: string,
  chunkIndex: number,
  totalChunks: number,
  genAI: GoogleGenerativeAI,
  language: string = DEFAULT_LANGUAGE
): Promise<{
  events: TimelineEvent[];
  title?: string;
  birthDate?: string;
  deathDate?: string;
  inputTokens?: number;
  outputTokens?: number;
} | null> {
  try {
    const isFirstChunk = chunkIndex === 0;
    logger.debug(`Processing chunk ${chunkIndex + 1}/${totalChunks} for ${pageName} (${chunkContent.length} chars)`);

    // Get system prompt tailored to this chunk with language consideration
    const systemInstruction = getSystemInstruction(isFirstChunk, language);

    // Create Gemini model with the appropriate settings
    const geminiModel = genAI.getGenerativeModel({ 
      model: DEFAULT_MODEL,
      generationConfig: {
        temperature: TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: TIMELINE_SCHEMA,
      },
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: systemInstruction

    });
    
 
    
    // Combine summary with chunk content
    const contentWithSummary = `SUMMARY: ${wikiSummary}\n\nCHUNK CONTENT (${chunkIndex + 1}/${totalChunks}): ${chunkContent}`;
    
    // Create user prompt
    const userPrompt = `
      Create a timeline for ${JSON.stringify(pageName.trim())}.
      Extract events with dates from the following content:
      ${JSON.stringify(contentWithSummary)}
    `;
    
    // Track approximate token usage
    const inputContent = systemInstruction + userPrompt;
    const inputTokens = Math.round(inputContent.length / 3); // Approximate token count

    // Call Gemini with system instruction
    const result = await geminiModel.generateContent(userPrompt);
    
    const response = result.response;
    
    // Log token usage
    const usageMetadata = response.usageMetadata;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    
    logger.debug(`Chunk ${chunkIndex + 1} token usage: ${inputTokens} input tokens, ${outputTokens} output tokens`);
    
    // Check if response was truncated
    const wasMaxTokensReached = response.candidates?.[0]?.finishReason === 'MAX_TOKENS';
    if (wasMaxTokensReached) {
      logger.error(`MAX_TOKENS reached in chunk ${chunkIndex + 1}, attempting to repair truncated JSON`);
      throw new Error(`MAX_TOKENS reached in chunk ${chunkIndex + 1}`);
    }
    
    // Extract the timeline data
    const data = JSON.parse(response.text());
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
        language: pageInfo.language
      };
    } catch (error) {
      logger.warn(`Could not fetch wiki summary for ${pageInfo.language}:${pageInfo.pageName}, using fallback:`, error);
      return {
        canonicalTitle: pageInfo.pageName,
        thumbnail: undefined,
        language: pageInfo.language
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
                wikiData.summary, 
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

        // Check if we have enough events
        if (!timeline || timeline.events.length < MIN_NUM_EVENTS_FOR_TIMELINE) {
          logger.warn(`Not enough events for ${pageInfo.language}:${pageInfo.pageName}: ${timeline?.events.length || 0} events`);
          noTimelinePages.push(pageInfo.original);
          return;
        }

        // Get or generate a wiki summary
        let wikiSummary: WikiSummary;
        try {
          // Set wiki to the correct language
          wiki.setLang(pageInfo.language);
          
          const pageSummary = await wiki.summary(pageInfo.pageName);
          wikiSummary = {
            pageUrl: pageSummary.content_urls?.desktop?.page || `https://${pageInfo.language}.wikipedia.org/wiki/${encodeURIComponent(pageInfo.pageName)}`,
            thumbnail: pageSummary.thumbnail?.source,
            summary: pageSummary.extract
          };
        } catch (error) {
          logger.error(`Error fetching detailed wiki summary for ${pageInfo.language}:${pageInfo.pageName}:`, error);
          wikiSummary = {
            pageUrl: `https://${pageInfo.language}.wikipedia.org/wiki/${encodeURIComponent(pageInfo.pageName)}`,
            thumbnail: undefined
          };
        }

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