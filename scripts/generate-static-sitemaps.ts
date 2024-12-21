const fs = require('fs/promises');
const path = require('path');

const SITE_CONFIG = {
  DOMAIN: 'https://wiki-timeline.com',
  URLS_PER_SITEMAP: 40000
};

async function readPageNames(filePaths: string[]): Promise<string[]> {
  const allPages = new Set<string>();
  
  for (const filePath of filePaths) {
    const content = await fs.readFile(filePath, 'utf-8');
    const pages = content.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#')); // Skip empty lines and comments
    
    pages.forEach((page: string) => allPages.add(page));
  }
  
  return Array.from(allPages).sort();
}

async function generateSitemaps(inputFiles: string[]) {
  try {
    const pageNames = await readPageNames(inputFiles);
    
    // Read existing sitemaps but don't modify them
    let currentSitemapCount = 0;
    try {
      const sitemapIndexContent = await fs.readFile('public/sitemap.xml', 'utf-8');
      const matches = sitemapIndexContent.match(/timelines-(\d+)\.xml/g);
      if (matches) {
        currentSitemapCount = Math.max(...matches.map((m: string) => parseInt(m.match(/\d+/)![0])));
      }
    } catch (error) {
      console.log('No existing sitemaps found, creating new ones');
    }

    // Get the last sitemap's content
    let lastSitemapContent = '';
    let lastSitemapUrls = new Set<string>();
    if (currentSitemapCount > 0) {
      try {
        lastSitemapContent = await fs.readFile(`public/sitemaps/timelines-${currentSitemapCount}.xml`, 'utf-8');
        const urls = lastSitemapContent.match(/\/timeline\/([^<]+)</g)?.map((u: string) => 
          decodeURIComponent(u.replace('/timeline/', '').replace('<', '')))
          .filter(u => !u.endsWith('/text')) || [];
        lastSitemapUrls = new Set(urls);
      } catch (error) {
        console.error('Error reading last sitemap:', error);
      }
    }

    // Start new sitemap if last one is full or doesn't exist
    let currentFileIndex = currentSitemapCount;
    if (currentSitemapCount === 0 || lastSitemapUrls.size >= SITE_CONFIG.URLS_PER_SITEMAP / 2) {
      currentFileIndex++;
      await fs.writeFile(
        `public/sitemaps/timelines-${currentFileIndex}.xml`,
        generateTimelineSitemap(pageNames)
      );
    } else {
      // Append new URLs to existing content
      const newContent = lastSitemapContent.replace('</urlset>', 
        pageNames.map(pageName => `
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${encodeURIComponent(pageName)}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${encodeURIComponent(pageName)}/text</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>`).join('') + '\n    </urlset>');
      
      await fs.writeFile(`public/sitemaps/timelines-${currentFileIndex}.xml`, newContent);
    }

    // Update sitemap index only if we created a new file
    if (currentFileIndex > currentSitemapCount) {
      const sitemapIndex = generateSitemapIndex(currentFileIndex);
      await fs.writeFile('public/sitemap.xml', sitemapIndex);
    }

    console.log(`Successfully added ${pageNames.length} new pages to sitemaps`);
  } catch (error) {
    console.error('Error generating sitemaps:', error);
  }
}

function generateSitemapIndex(sitemapCount: number) {
  const sitemaps = [`
    <sitemap>
      <loc>${SITE_CONFIG.DOMAIN}/sitemaps/static.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>`];

  for (let i = 1; i <= sitemapCount; i++) {
    sitemaps.push(`
    <sitemap>
      <loc>${SITE_CONFIG.DOMAIN}/sitemaps/timelines-${i}.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemaps.join('')}
    </sitemapindex>`;
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
    </urlset>`;
}

function generateTimelineSitemap(pageNames: string[]) {
  const urls = pageNames.map(pageName => `
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${encodeURIComponent(pageName)}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${encodeURIComponent(pageName)}/text</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`;
}

// Get input files from command line arguments
const inputFiles = process.argv.slice(2);
if (inputFiles.length === 0) {
  console.error('Please provide at least one input file');
  process.exit(1);
}

generateSitemaps(inputFiles); 