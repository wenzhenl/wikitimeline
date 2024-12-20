import { MetadataRoute } from 'next'
import { Redis } from '@upstash/redis'
import { SITE_CONFIG } from './config/site'

const redis = Redis.fromEnv()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    let cursor = 0
    let keys: string[] = []
    
    // Use SCAN to get all keys in batches
    do {
      const [nextCursor, batch] = await redis.scan(cursor, {
        match: 'timeline:*',
        count: 100
      })
      cursor = parseInt(nextCursor as string)
      keys = keys.concat(batch)
    } while (cursor !== 0)

    const totalKeys = keys.length
    const sitemapCount = Math.ceil(totalKeys * 2.0 / SITE_CONFIG.URLS_PER_SITEMAP)

    const staticSitemap = {
      url: `${SITE_CONFIG.DOMAIN}/sitemaps/static.xml`,
      lastModified: new Date(),
    }

    const timelineSitemaps = Array.from({ length: sitemapCount }, (_, i) => ({
      url: `${SITE_CONFIG.DOMAIN}/sitemaps/timelines-${i + 1}.xml`,
      lastModified: new Date(),
    }))

    return [staticSitemap, ...timelineSitemaps]
  } catch (error) {
    console.error('Error generating sitemap index:', error)
    return [
      {
        url: `${SITE_CONFIG.DOMAIN}/sitemaps/static.xml`,
        lastModified: new Date(),
      },
    ]
  }
} 