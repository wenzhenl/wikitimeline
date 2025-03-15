import { GoogleGenerativeAI } from "@google/generative-ai";
import wiki from "wikipedia";
import { Redis } from "@upstash/redis";
import logger from "@/app/utils/logger";
import {
  TimelineAPIResponse,
  Timeline,
  TimelineEvent,
  TimelinePageResult,
  TimelineSystemError,
  TimelinePageStatus,
} from "@/app/types/timeline";
import {
  PAGE_DELIMITER,
  PAGE_NAME_SEPARATOR,
  DEFAULT_LANGUAGE,
  DEFAULT_MODEL,
  DEFAULT_TIMELINE_VERSION,
  MIN_NUM_EVENTS_FOR_TIMELINE,
} from "@/app/constants";
import { unstable_cache } from "next/cache";
import { SITE_CONFIG } from "@/app/config/site";
import { SAFETY_SETTINGS } from "@/app/constants/gemini/safetySettings";
import {
  MAX_OUTPUT_TOKENS,
  PRESENCE_PENALTY,
  TEMPERATURE,
  TOP_K,
  TOP_P,
} from "@/app/constants/gemini";
import {
  WIKI_EVENTS_EXTRACTION_PROMPT,
  WIKI_METADATA_EXTRACTION_PROMPT,
} from "@/app/constants/gemini/systemPrompt";
import { compareDates, getLanguageName } from "@/app/utils/helper";
import {
  WIKI_EVENTS_SCHEMA,
  WIKI_METADATA_SCHEMA,
} from "@/app/constants/gemini/timelineSchema";
import { ERROR_MESSAGES } from "@/app/constants/errorMessages";

// Initialize Redis
const redis = Redis.fromEnv();

// Initialize Wikipedia with User-Agent
const userAgent = `WikiTimeline/1.0.0 (${SITE_CONFIG.DOMAIN}; ${SITE_CONFIG.CONTACT_EMAIL})`;
wiki.setUserAgent(userAgent);
logger.debug("Wikipedia User-Agent set:", userAgent);

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
      original: trimmedName,
    };
  }

  // No language specified or invalid language, use default
  return {
    language: DEFAULT_LANGUAGE,
    pageName: trimmedName,
    original: trimmedName,
  };
}

// Function to construct cache key
function buildCacheKey(pageInfo: PageInfo): string {
  return `timeline|${pageInfo.language}|${pageInfo.pageName}`;
}

function calculateAge(birthDate: string, eventDate: string): number | null {
  // Handle negative years (BCE)
  const birthYear =
    parseInt(
      birthDate.startsWith("-") ? birthDate.slice(1) : birthDate.split("-")[0]
    ) * (birthDate.startsWith("-") ? -1 : 1);
  const eventYear =
    parseInt(
      eventDate.startsWith("-") ? eventDate.slice(1) : eventDate.split("-")[0]
    ) * (eventDate.startsWith("-") ? -1 : 1);

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
      lastUpdatedAt: Date.now(),
    };
  }

  // Log the initial count of events
  const initialEventCount = timeline.events.length;
  logger.debug(`Processing timeline with ${initialEventCount} events`);

  // Sort events by date using compareDates function to properly handle negative years
  const sortedEvents = [...timeline.events].sort((a, b) => {
    const aDate = a.startDate || "";
    const bDate = b.startDate || "";
    return compareDates(aDate, bDate);
  });

  // Deduplicate events - more robust approach for events from multiple chunks
  const uniqueEvents: TimelineEvent[] = [];
  const seenHeadlines = new Set<string>();
  const seenDateHeadlinePairs = new Set<string>();

  // Counters for different types of duplicates
  let exactDuplicates = 0;
  let similarHeadlineDuplicates = 0;
  let similarWordingDuplicates = 0;

  for (const event of sortedEvents) {
    // Skip events without a start date
    if (!event.startDate) continue;

    // Create a unique key combining date and headline
    const dateHeadlineKey = `${event.startDate}|${event.headline}`;

    // Check for exact duplicates (same date and headline)
    if (seenDateHeadlinePairs.has(dateHeadlineKey)) {
      exactDuplicates++;
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
          const existingYear =
            parseInt(
              existingDate.startsWith("-")
                ? existingDate.slice(1)
                : existingDate.split("-")[0]
            ) * (existingDate.startsWith("-") ? -1 : 1);
          const currentYear =
            parseInt(
              currentDate.startsWith("-")
                ? currentDate.slice(1)
                : currentDate.split("-")[0]
            ) * (currentDate.startsWith("-") ? -1 : 1);

          if (Math.abs(existingYear - currentYear) <= 1) {
            isDuplicate = true;
            similarHeadlineDuplicates++;
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
          const existingWords = new Set(
            existingEvent.headline
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 3)
          );
          const currentWords = event.headline
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);

          // If more than 50% of significant words match, consider it a duplicate
          const matchingWords = currentWords.filter((word) =>
            existingWords.has(word)
          );
          if (
            matchingWords.length > 0 &&
            matchingWords.length / currentWords.length > 0.5
          ) {
            isDuplicate = true;
            similarWordingDuplicates++;
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

  // Log deduplication results
  const totalDuplicates =
    exactDuplicates + similarHeadlineDuplicates + similarWordingDuplicates;
  const finalEventCount = uniqueEvents.length;
  const percentReduction =
    initialEventCount > 0
      ? (
          ((initialEventCount - finalEventCount) / initialEventCount) *
          100
        ).toFixed(1)
      : "0";

  logger.info(
    `Deduplication results: ${initialEventCount} → ${finalEventCount} events (${percentReduction}% reduction)`
  );
  logger.info(
    `Duplicates removed: ${totalDuplicates} total (${exactDuplicates} exact, ${similarHeadlineDuplicates} similar headline, ${similarWordingDuplicates} similar wording)`
  );

  // Add age information for person timelines
  if (timeline.birthDate) {
    uniqueEvents.forEach((event) => {
      // Only calculate age if event date is after birth date
      if (compareDates(event.startDate, timeline.birthDate!) >= 0) {
        // If death date exists, only calculate age if event date is before or equal to death date
        if (
          !timeline.deathDate ||
          compareDates(event.startDate, timeline.deathDate) <= 0
        ) {
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
    lastUpdatedAt: Date.now(),
  };
}

// Modified function to generate timeline using parallel chunk processing
async function generateTimeline(
  pageName: string,
  wikiContent: string,
  wikiIntro: string,
  genAI: GoogleGenerativeAI,
  language: string = DEFAULT_LANGUAGE
): Promise<Timeline> {
  logger.debug(`Generating timeline for ${pageName} (language: ${language})`);

  const startTime = Date.now();

  // Make two parallel API calls
  const [events, metadata] = await Promise.all([
    extractEventsFromWikiContent(genAI, wikiContent, pageName, language),
    extractMetadataFromWikiIntro(genAI, wikiIntro, pageName, language),
  ]);

  const endTime = Date.now();
  const processingTime = (endTime - startTime) / 1000; // in seconds

  logger.debug(
    `Timeline generation for ${pageName} completed in ${processingTime.toFixed(
      2
    )} seconds`
  );
  // Build the timeline
  const timeline: Timeline = {
    title: metadata.title || pageName,
    events: events,
    birthDate: metadata.birthDate,
    deathDate: metadata.deathDate,
  };

  // Post-process the timeline
  return postProcessTimeline(timeline);
}

// Helper function to extract metadata from wiki intro
async function extractMetadataFromWikiIntro(
  genAI: GoogleGenerativeAI,
  wikiIntro: string,
  pageName: string,
  language: string
): Promise<{ title: string; birthDate?: string; deathDate?: string }> {
  const systemPrompt = WIKI_METADATA_EXTRACTION_PROMPT.replaceAll(
    "#LANGUAGE#",
    getLanguageName(language)
  );

  logger.debug("WIKI_METADATA_EXTRACTION_PROMPT", systemPrompt);

  try {
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        topP: TOP_P,
        topK: TOP_K,
        presencePenalty: PRESENCE_PENALTY,
        responseMimeType: "application/json",
        responseSchema: WIKI_METADATA_SCHEMA,
      },
      systemInstruction: systemPrompt,
    });

    // Create the prompt for metadata extraction
    const userPrompt = `      
      Extract metadata from the following article:
      <article>
      ${wikiIntro}
      </article>

      Please use your FULL capabilities to extract all the metadata in the same language as the article: ${getLanguageName(
        language
      )}, you only have only ONE chance to get it right, the data is stored permanently and will be used by millions of people.
    `;

    // Call Gemini to extract metadata
    logger.debug(`Extracting metadata for ${pageName}`);
    const response = await model.generateContent(userPrompt);
    const textResponse = response.response.text();

    // Track token usage if available
    logger.debug("Token usage for extracting metadata:");
    logger.debug(JSON.stringify(response.response.usageMetadata, null, 2));

    // Parse the JSON response
    try {
      // Clean up the response
      let jsonString = textResponse.trim();

      // If the response starts with markdown code block indicators, strip them
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.replace(/```json\n/, "").replace(/\n```$/, "");
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/```\n/, "").replace(/\n```$/, "");
      }

      // Parse the JSON
      const metadata = JSON.parse(jsonString);
      return {
        title: metadata.title || pageName,
        birthDate: metadata.birthDate,
        deathDate: metadata.deathDate,
      };
    } catch (jsonError) {
      logger.error("Failed to parse metadata JSON", jsonError);
      // Return default metadata
      return {
        title: pageName,
        birthDate: undefined,
        deathDate: undefined,
      };
    }
  } catch (error) {
    logger.error(`Failed to extract metadata for ${pageName}:`, error);
    // Return default metadata
    return {
      title: pageName,
      birthDate: undefined,
      deathDate: undefined,
    };
  }
}

// Helper function to extract events from Wikipedia content
async function extractEventsFromWikiContent(
  genAI: GoogleGenerativeAI,
  wikiContent: string,
  pageName: string,
  language: string
): Promise<TimelineEvent[]> {
  const systemPrompt = WIKI_EVENTS_EXTRACTION_PROMPT.replaceAll(
    "#LANGUAGE#",
    getLanguageName(language)
  );

  logger.debug("WIKI_EVENTS_EXTRACTION_PROMPT", systemPrompt);
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      topP: TOP_P,
      topK: TOP_K,
      presencePenalty: PRESENCE_PENALTY,
      responseMimeType: "application/json",
      responseSchema: WIKI_EVENTS_SCHEMA,
    },
    systemInstruction: systemPrompt,
  });

  // Track accumulated events
  let accumulatedEvents: TimelineEvent[] = [];
  let iterations = 0;
  const MAX_ITERATIONS = 3;

  // Initial prompt
  let userPrompt = `
    Extract events from: ${pageName}
    
    <wikipedia_content>
    ${wikiContent}
    </wikipedia_content>

    Please use your FULL capabilities to extract all the events in the same language as the article: ${getLanguageName(
      language
    )}, you only have only ONE chance to get it right, the data is stored permanently and will be used by millions of people.
  `;

  while (iterations < MAX_ITERATIONS) {
    // Call Gemini with the prompt
    logger.debug(
      `Extracting events (iteration ${iterations + 1}/${MAX_ITERATIONS})`
    );

    const response = await model.generateContent(userPrompt);
    let textResponse = response.response.text();

    // Track token usage if available
    logger.debug(
      "Token usage for extracting events, iteration " + (iterations + 1) + ":"
    );
    logger.debug(JSON.stringify(response.response.usageMetadata, null, 2));

    // Clean up the response text
    let jsonText = textResponse.trim();

    // Remove markdown code block indicators if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n/, "").replace(/\n```$/, "");
    }

    // Try to fix broken JSON
    if (!jsonText.endsWith("]")) {
      // Find the last complete event object
      const lastCompleteEventIndex = jsonText.lastIndexOf("},");
      if (lastCompleteEventIndex !== -1) {
        // Keep everything up to and including the last complete event
        jsonText = jsonText.substring(0, lastCompleteEventIndex + 1) + "]";
      } else {
        // If no complete event found with comma, try finding last complete event
        const lastEventIndex = jsonText.lastIndexOf("}");
        if (lastEventIndex !== -1) {
          jsonText = jsonText.substring(0, lastEventIndex + 1) + "]";
        } else {
          throw new Error("No complete events found in response");
        }
      }
    }

    // Parse the JSON array
    const events = JSON.parse(jsonText) as TimelineEvent[];

    // Add valid events to accumulated list
    if (Array.isArray(events)) {
      accumulatedEvents = [...accumulatedEvents, ...events];
    }

    // Check if response was truncated due to token limits
    const finishReason = response.response.candidates?.[0]?.finishReason;

    if (finishReason === "MAX_TOKENS" && iterations < MAX_ITERATIONS - 1) {
      logger.info(
        `MAX_TOKENS reached in iteration ${iterations + 1}, continuing...`
      );

      // Create a new prompt to continue
      userPrompt = `
        Extract events from: ${pageName}
        
        <article>
        ${wikiContent}
        </article>

        You were extracting events but reached the token limit. Continue from where you left off.
        Here are the events you've extracted so far:
        ${JSON.stringify(accumulatedEvents, null, 2)}
        
        Continue extracting events from: ${pageName}, but only extract events that are not already in the events list above.
        
        Please use your FULL capabilities to extract all the events in the same language as the article: ${getLanguageName(
          language
        )}, you only have only ONE chance to get it right, the data is stored permanently and will be used by millions of people.
      `;

      iterations++;
    } else {
      // Either we finished successfully or reached our iteration limit
      break;
    }
  }

  return accumulatedEvents;
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
        pageUrl:
          summary.content_urls?.desktop?.page ||
          `https://${pageInfo.language}.wikipedia.org/wiki/${encodeURIComponent(
            pageInfo.pageName
          )}`,
      };
    } catch (error) {
      logger.warn(
        `Could not fetch wiki summary for ${pageInfo.language}:${pageInfo.pageName}, using fallback:`,
        error
      );
      return {
        canonicalTitle: pageInfo.pageName,
        thumbnail: undefined,
        pageUrl: `https://${
          pageInfo.language
        }.wikipedia.org/wiki/${encodeURIComponent(pageInfo.pageName)}`,
      };
    }
  },
  ["wiki-summary"],
  {
    revalidate: 3600,
    tags: ["wiki-summary"],
  }
);

// Initialize Gemini with appropriate key based on client type
function getGeminiClient(clientType: string | null): GoogleGenerativeAI {
  const apiKey =
    clientType === "cli"
      ? process.env.GEMINI_CLI_API_KEY
      : process.env.GEMINI_API_KEY;

  return new GoogleGenerativeAI(apiKey!);
}

// Helper function to fetch Wikipedia content
async function fetchWikipediaContent(
  pageInfo: PageInfo
): Promise<{ content: string; intro: string }> {
  // Set wiki to the correct language
  wiki.setLang(pageInfo.language);

  logger.debug(
    `Fetching wiki page for ${pageInfo.language}:${pageInfo.pageName}`
  );

  // Fetch content, intro, and tables all in parallel
  const [content, intro, tables] = await Promise.all([
    wiki.content(pageInfo.pageName),
    wiki.intro(pageInfo.pageName),
    wiki.tables(pageInfo.pageName).catch((error) => {
      // Handle tables error gracefully
      logger.warn(
        `Could not fetch tables for ${pageInfo.language}:${pageInfo.pageName}:`,
        error
      );
      return []; // Return empty array if tables fail
    }),
  ]);

  // Only process tables if they exist and have content
  const tablesContent =
    Array.isArray(tables) && tables.length > 0
      ? tables.map((table) => JSON.stringify(table, null, 2)).join("\n\n")
      : "";

  return {
    content: content + (tablesContent ? "\n\n" + tablesContent : ""),
    intro: intro,
  };
}

// Update the GET handler with new error handling
export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
): Promise<Response> {
  const clientType = request.headers.get("x-internal-client-type");

  try {
    const genAI = getGeminiClient(clientType);
    if (!genAI) {
      throw new Error("Failed to initialize Gemini client");
    }

    // First decode the URL parameters
    const rawPageNames = decodeURIComponent(params.pageName)
      .split(PAGE_DELIMITER)
      .map((name) => name.trim())
      .filter(Boolean);

    // Parse each page name to extract language and actual page name
    const pageInfos = rawPageNames.map(parsePageName);

    logger.info(`Processing ${pageInfos.length} pages`);
    logger.debug(
      `Page info details: ${JSON.stringify(
        pageInfos.map((p) => `${p.language}:${p.pageName}`)
      )}`
    );

    const results: Record<string, TimelinePageResult> = {};

    // Process each page completely independently
    await Promise.all(
      pageInfos.map(async (pageInfo) => {
        try {
          // Step 1: Get canonical title and wiki summary in one go
          const wikiSummary = await getCachedWikiSummary(pageInfo);

          // If pageName is different from canonical title, update pageInfo
          if (wikiSummary.canonicalTitle !== pageInfo.pageName) {
            logger.info(
              `Redirecting ${pageInfo.language}:${pageInfo.pageName} to canonical title: ${wikiSummary.canonicalTitle}`
            );
            pageInfo = {
              ...pageInfo,
              pageName: wikiSummary.canonicalTitle,
            };
          }

          // Step 2: Check cache for timeline using updated pageInfo
          const cacheKey = buildCacheKey(pageInfo);
          let timeline: Timeline | null = null;

          const cached = await redis.get(cacheKey);
          if (cached && typeof cached === "object") {
            const cachedData = cached as NewTimelineFormat;
            const cachedTimeline = cachedData.timeline;

            // Check if cached timeline exists and version matches
            if (
              cachedTimeline &&
              cachedTimeline.version === DEFAULT_TIMELINE_VERSION
            ) {
              timeline = cachedTimeline;
              logger.info(
                `Using cached timeline for ${pageInfo.language}:${pageInfo.pageName}`
              );
            } else if (cachedTimeline) {
              logger.info(
                `Cached timeline version mismatch for ${pageInfo.language}:${pageInfo.pageName} (cached: ${cachedTimeline.version}, current: ${DEFAULT_TIMELINE_VERSION}), regenerating...`
              );
            }
          }

          // Step 3: If no cached timeline, generate a new one
          if (!timeline) {
            // Create a lock key specific to this page
            const lockKey = `lock:${cacheKey}`;
            const lockTimeout = 300; // 5 minutes lock timeout

            // Try to acquire a lock with an expiration
            const lockAcquired = await redis.set(
              lockKey,
              Date.now().toString(),
              {
                nx: true, // Only set if key doesn't exist
                ex: lockTimeout, // Expire after timeout seconds
              }
            );

            if (lockAcquired) {
              // We acquired the lock, so we'll generate the timeline
              logger.info(
                `Acquired lock and generating new timeline for ${pageInfo.language}:${pageInfo.pageName}`
              );

              try {
                // Fetch Wikipedia content
                const wikiData = await fetchWikipediaContent(pageInfo);

                // Generate timeline
                timeline = await generateTimeline(
                  pageInfo.pageName,
                  wikiData.content,
                  wikiData.intro,
                  genAI,
                  pageInfo.language
                );

                if (timeline) {
                  logger.info(
                    `Caching timeline for ${pageInfo.language}:${pageInfo.pageName} (${timeline.events.length} events)`
                  );
                  await redis.set(cacheKey, { timeline });
                }
              } catch (error) {
                // Log detailed error information
                logger.error(
                  `Error generating timeline for ${pageInfo.language}:${pageInfo.pageName}:`,
                  error
                );

                // Handle Wikipedia API errors
                if (
                  error instanceof Error &&
                  "statusCode" in error &&
                  (error as any).statusCode === 404
                ) {
                  results[pageInfo.original] = {
                    status: "not_found",
                    message: "Page does not exist in Wikipedia",
                  };
                } else {
                  results[pageInfo.original] = {
                    status: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Failed to fetch Wikipedia content or generate timeline",
                  };
                }
                return;
              } finally {
                // Always release the lock when done, whether successful or not
                await redis.del(lockKey);
                logger.info(
                  `Released lock for ${pageInfo.language}:${pageInfo.pageName}`
                );
              }
            } else {
              // Someone else is already generating this timeline
              logger.info(
                `Another process is already generating timeline for ${pageInfo.language}:${pageInfo.pageName}`
              );

              // Return a message indicating the timeline is being generated
              results[pageInfo.original] = {
                status: "error",
                message: ERROR_MESSAGES.TIMELINE_IN_PROGRESS,
              };
              return;
            }
          }

          // Step 4: Set the results using the wiki summary we already have
          if (
            timeline &&
            timeline.events.length > MIN_NUM_EVENTS_FOR_TIMELINE
          ) {
            results[pageInfo.original] = {
              status: "success",
              timeline,
              wikiSummary,
            };
          } else {
            results[pageInfo.original] = {
              status: "not_found",
              message: "No dated events found in the content",
            };
          }
        } catch (error) {
          // Handle individual page errors gracefully
          logger.error(
            `Error processing ${pageInfo.language}:${pageInfo.pageName}:`,
            error
          );

          results[pageInfo.original] = {
            status: "error",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      })
    );

    // Count pages by status
    const statusCounts = Object.values(results).reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<TimelinePageStatus, number>);

    // Determine response status
    if (statusCounts.success && statusCounts.success > 0) {
      // At least one successful timeline, return 200
      const response: TimelineAPIResponse = {
        results,
        metadata: {
          totalPages: pageInfos.length,
          successfulPages: statusCounts.success,
        },
      };

      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else if (
      Object.keys(statusCounts).length === 1 &&
      statusCounts.not_found
    ) {
      // All pages are not found, return 404
      const response: TimelineAPIResponse = {
        results,
        metadata: {
          totalPages: pageInfos.length,
          successfulPages: 0,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      // Either all errors or mix of errors and not_found, return 500
      const systemError: TimelineSystemError = {
        error: "system_error",
        message: "Failed to generate any timelines successfully",
      };

      return new Response(JSON.stringify(systemError), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    // Handle true system-level errors (API keys, Redis connection, etc.)
    logger.error("System error in timeline API:", error);

    const systemError: TimelineSystemError = {
      error: "system_error",
      message:
        error instanceof Error
          ? error.message
          : "An unexpected system error occurred",
    };

    return new Response(JSON.stringify(systemError), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
