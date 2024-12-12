import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { SITE_CONFIG } from '@/app/config/site'

const redis = Redis.fromEnv()

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    if (slug === 'static.xml') {
      return new NextResponse(generateStaticSitemap(), {
        headers: { 'Content-Type': 'application/xml' },
      })
    }

    const pageMatch = slug.match(/timelines-(\d+)/)
    if (pageMatch) {
      const page = parseInt(pageMatch[1])
      const start = (page - 1) * SITE_CONFIG.URLS_PER_SITEMAP
      
      const allKeys = await redis.keys('timeline:*')
      const paginatedKeys = allKeys.slice(start, start + SITE_CONFIG.URLS_PER_SITEMAP)

      const xml = generateTimelineSitemap(paginatedKeys)
      return new NextResponse(xml, {
        headers: { 'Content-Type': 'application/xml' },
      })
    }

    return new NextResponse('Not found', { status: 404 })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

function generateStaticSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${SITE_CONFIG.DOMAIN}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
    </urlset>`
}

function generateTimelineSitemap(keys: string[]) {
  const urls = keys.map(key => {
    const timelineName = key.replace('timeline:', '')
    return `
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${timelineName}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${timelineName}/text</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`
} 