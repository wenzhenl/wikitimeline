import { OpenAI } from 'openai';
import wiki from 'wikipedia';
import { Redis } from '@upstash/redis';
import { CACHE_CONFIG } from '@/app/config/cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Redis
const redis = Redis.fromEnv();

async function getWikipediaInfo(title: string): Promise<{ pageUrl: string; thumbnail?: string; summary?: string; error?: string }> {
  try {
    const summary = await wiki.summary(title);
    return {
      pageUrl: `https://en.wikipedia.org/wiki/${title}`,
      thumbnail: summary.thumbnail?.source,
      summary: summary.extract
    };
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
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
      console.log(`Cache hit for ${pageName}`);
      return cached;
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  // If not in cache, fetch from OpenAI
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: 
          "You are a timeline generator that extracts events directly from Wikipedia articles. " +
          "Create a chronological timeline starting with birth (if applicable) and including all major life events through to death (if applicable). " +
          "Return a JSON object with a 'timeline' array. Each event should have: " +
          "'date' (YYYY-MM-DD format), 'headline' (brief title), and 'text' (detailed description). " +
          "Ensure all dates and events are factually accurate and sourced from Wikipedia. " +
          "Do not skip significant life events or major milestones."
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
  console.log(`Token usage for ${pageName}:`, {
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_tokens: completion.usage?.total_tokens,
    cached_tokens: completion.usage?.prompt_tokens_details?.cached_tokens || 0,
    model: completion.model,
  });

  const result = JSON.parse(completion.choices[0].message.content!);
  
  // Store in cache using TTL from config
  try {
    await redis.set(cacheKey, result, { ex: CACHE_CONFIG.TIMELINE.TTL });
    console.log(`Cached timeline for ${pageName}`);
  } catch (error) {
    console.warn('Cache write error:', error);
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
    
    const eventPromises = pageNames.map(async (pageName) => {
      const wikiInfo = await getWikipediaInfo(pageName.trim());
      
      if (wikiInfo.error) {
        failedPages.push(pageName.trim());
        return [];
      }
      
      const parsedContent = await getCachedCompletion(pageName.trim(), wikiInfo.summary);
      
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

    // Wait for all promises to resolve
    const allEventsArrays = await Promise.all(eventPromises);
    const allEvents = allEventsArrays.flat();
    
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const response: any = { timeline: allEvents };
    if (failedPages.length > 0) {
      response.errors = {
        message: 'Some pages could not be fetched from Wikipedia',
        failedPages
      };
    }
    
    return Response.json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json(
      { error: 'Failed to generate timeline' },
      { status: 500 }
    );
  }
} 