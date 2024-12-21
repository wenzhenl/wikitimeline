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
    
    // Read existing sitemaps to determine current content
    const existingSitemaps = new Map<number, Set<string>>();
    let currentSitemapCount = 0;

    try {
      const sitemapIndexContent = await fs.readFile('public/sitemap.xml', 'utf-8');
      const matches = sitemapIndexContent.match(/timelines-(\d+)\.xml/g);
      if (matches) {
        currentSitemapCount = Math.max(...matches.map((m: string) => parseInt(m.match(/\d+/)![0])));
        
        // Load existing URLs from each sitemap
        for (let i = 1; i <= currentSitemapCount; i++) {
          const content = await fs.readFile(`public/sitemaps/timelines-${i}.xml`, 'utf-8');
          const urls = new Set<string>(content.match(/\/timeline\/([^<]+)</g)?.map((u: string) => 
            decodeURIComponent(u.replace('/timeline/', '').replace('<', ''))) || []);
          existingSitemaps.set(i, urls);
        }
      }
    } catch (error) {
      // If files don't exist, start fresh
      console.log('No existing sitemaps found, creating new ones');
    }

    // Filter out pages that already exist in sitemaps
    const existingPages = new Set();
    existingSitemaps.forEach(urls => urls.forEach(url => existingPages.add(url)));
    const newPages = pageNames.filter(page => !existingPages.has(page));

    if (newPages.length === 0) {
      console.log('No new pages to add');
      return;
    }

    // Ensure directories exist
    await fs.mkdir('public/sitemaps', { recursive: true });

    // Add new pages to existing or new sitemaps
    let currentFileIndex = currentSitemapCount || 1;
    let currentFileUrls = existingSitemaps.get(currentFileIndex) || new Set();

    for (const page of newPages) {
      if (currentFileUrls.size >= SITE_CONFIG.URLS_PER_SITEMAP / 2) {
        // Current file is full, write it and start a new one
        await fs.writeFile(
          `public/sitemaps/timelines-${currentFileIndex}.xml`,
          generateTimelineSitemap(Array.from(currentFileUrls))
        );
        currentFileIndex++;
        currentFileUrls = new Set();
      }
      currentFileUrls.add(page);
    }

    // Write the last sitemap file
    if (currentFileUrls.size > 0) {
      await fs.writeFile(
        `public/sitemaps/timelines-${currentFileIndex}.xml`,
        generateTimelineSitemap(Array.from(currentFileUrls))
      );
    }

    // Update sitemap index
    const sitemapIndex = generateSitemapIndex(currentFileIndex);
    await fs.writeFile('public/sitemap.xml', sitemapIndex);

    console.log(`Successfully added ${newPages.length} new pages to sitemaps`);
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