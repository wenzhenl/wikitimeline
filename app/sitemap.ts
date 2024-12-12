import { MetadataRoute } from 'next'
import { Redis } from '@upstash/redis'
import { SITE_CONFIG } from './config/site'

const redis = Redis.fromEnv()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const keys = await redis.keys('timeline:*')
    const totalKeys = keys.length
    const sitemapCount = Math.ceil(totalKeys / SITE_CONFIG.URLS_PER_SITEMAP * 2.0)

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