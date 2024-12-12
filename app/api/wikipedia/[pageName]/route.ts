import { OpenAI } from 'openai';
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import { CACHE_CONFIG } from '@/app/config/cache';
import logger from '@/app/utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Redis
const redis = Redis.fromEnv();

async function getWikipediaInfo(title: string): Promise<{ pageUrl: string; thumbnail?: string; summary?: string; error?: string }> {
  const cacheKey = `wiki_page:${title}`;
  
  // Try to get from cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === 'object' && 'pageUrl' in cached) {
      logger.info(`Cache hit for Wikipedia page ${title}`);
      return cached as { pageUrl: string; thumbnail?: string; summary?: string; error?: string };
    }
  } catch (error) {
    logger.warn('Cache read error:', error);
  }

  try {
    const summary = await wiki.summary(title);
    const result = {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      thumbnail: summary.thumbnail?.source,
      summary: summary.extract
    };

    // Cache for 24 hours
    await redis.set(cacheKey, result, { ex: 86400 });
    
    return result;
  } catch (error) {
    logger.error('Error fetching Wikipedia info:', error);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      error: 'Could not fetch Wikipedia information'
    };
  }
}

function formatGroupName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

async function getCachedCompletion(pageName: string, summary?: string) {
  const cacheKey = `timeline:${pageName}`;
  
  // Try to get from cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for ${pageName}`);
      return cached;
    }
  } catch (error) {
    logger.warn('Cache read error:', error);
  }

  // If not in cache, fetch from OpenAI
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: 
          "You are a timeline generator that extracts events directly from Wikipedia articles. " +
          "Create a comprehensive chronological timeline starting with birth (if applicable) and including all major life events through to death (if applicable). " +
          "Return a JSON object with a 'timeline' array. Each event should have: " +
          "'date' (use the most precise date available, following these formats: " +
          "- YYYY for year only (e.g., '0220' or '-0220' for 220 BCE)" +
          "- YYYY-MM for year and month" +
          "- YYYY-MM-DD for full dates), " +
          "'headline' (brief title), and 'text' (detailed description). " +
          "IMPORTANT: For dates before year 0 (BCE/BC), always use negative years (e.g., '-0221' for 221 BCE). " +
          "Include as many significant events as possible, especially for historical figures. " +
          "For ancient historical figures, include major accomplishments, reforms, battles, political changes, and cultural impacts. " +
          "Ensure all dates and events are factually accurate and sourced from Wikipedia."
      },
      {
        role: "user",
        content: `Create a timeline for ${pageName.trim()} ${summary ? ` (${summary})` : ''}`
      }
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
  });

  // Log token usage
  logger.info(`Token usage for ${pageName}:`, {
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_tokens: completion.usage?.total_tokens,
    cached_tokens: completion.usage?.prompt_tokens_details?.cached_tokens || 0,
    model: completion.model,
  });

  const result = JSON.parse(completion.choices[0].message.content!);
  logger.debug(result);
  
  // Store in cache using TTL from config
  try {
    await redis.set(cacheKey, result, { ex: CACHE_CONFIG.TIMELINE.TTL });
    logger.info(`Cached timeline for ${pageName}`);
  } catch (error) {
    logger.warn('Cache write error:', error);
  }

  return result;
}

export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
) {
  try {
    const pageNames = decodeURIComponent(params.pageName).split(',');
    const failedPages: string[] = [];
    const noTimelinePages: string[] = [];
    
    const eventPromises = pageNames.map(async (pageName) => {
      const wikiInfo = await getWikipediaInfo(pageName.trim());
      
      if (wikiInfo.error) {
        failedPages.push(pageName.trim());
        return [];
      }
      
      const parsedContent = await getCachedCompletion(pageName.trim(), wikiInfo.summary);
      
      // Check if timeline was generated
      if (!parsedContent.timeline || parsedContent.timeline.length === 0) {
        noTimelinePages.push(pageName.trim());
        return [];
      }
      
      return parsedContent.timeline.map((event: any) => ({
        date: event.date,
        text: {
          headline: event.headline,
          text: event.text
        },
        group: formatGroupName(pageName.trim()),
        media: {
          thumbnail: wikiInfo.thumbnail,
        }
      }));
    });

    const allEventsArrays = await Promise.all(eventPromises);
    const allEvents = allEventsArrays.flat();
    
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const response: any = { timeline: allEvents };
    
    // Combine both types of failures in the error message
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
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
} 