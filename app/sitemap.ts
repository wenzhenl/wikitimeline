import { MetadataRoute } from 'next'
import { Redis } from '@upstash/redis'

const URLS_PER_SITEMAP = 40000
const redis = Redis.fromEnv()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Get total count of timelines using KEYS pattern matching
    const keys = await redis.keys('timeline:*')
    const totalKeys = keys.length
    const sitemapCount = Math.ceil(totalKeys / URLS_PER_SITEMAP)

    const staticSitemap = {
      url: 'https://wikitimeline-nu.vercel.app/sitemaps/static.xml',
      lastModified: new Date(),
    }

    const timelineSitemaps = Array.from({ length: sitemapCount }, (_, i) => ({
      url: `https://wikitimeline-nu.vercel.app/sitemaps/timelines-${i + 1}.xml`,
      lastModified: new Date(),
    }))

    return [staticSitemap, ...timelineSitemaps]
  } catch (error) {
    console.error('Error generating sitemap index:', error)
    return [
      {
        url: 'https://wikitimeline-nu.vercel.app/sitemaps/static.xml',
        lastModified: new Date(),
      },
    ]
  }
} 