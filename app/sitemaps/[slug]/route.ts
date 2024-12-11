import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'

const URLS_PER_SITEMAP = 40000 // Keep under 50,000 limit
const DOMAIN = 'https://wikitimeline-nu.vercel.app'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Handle static sitemap
    if (slug === 'static.xml') {
      return new NextResponse(generateStaticSitemap(), {
        headers: { 'Content-Type': 'application/xml' },
      })
    }

    // Handle timeline sitemaps
    const pageMatch = slug.match(/timelines-(\d+)/)
    if (pageMatch) {
      const page = parseInt(pageMatch[1])
      const start = (page - 1) * URLS_PER_SITEMAP
      
      // Get paginated keys from KV
      // Using SCAN instead of KEYS for pagination
      const { keys, cursor } = await kv.scan(start, { 
        match: 'timeline:*', 
        count: URLS_PER_SITEMAP 
      })

      const xml = generateTimelineSitemap(keys)
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
        <loc>${DOMAIN}</loc>
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
        <loc>${DOMAIN}/timeline/${timelineName}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`
} 