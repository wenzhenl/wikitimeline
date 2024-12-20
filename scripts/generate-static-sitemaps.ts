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
    const sitemapCount = Math.ceil(pageNames.length * 2.0 / SITE_CONFIG.URLS_PER_SITEMAP);

    // Ensure directories exist
    await fs.mkdir('public/sitemaps', { recursive: true });

    // Generate sitemap index
    const sitemapIndex = generateSitemapIndex(sitemapCount);
    await fs.writeFile('public/sitemap.xml', sitemapIndex);

    // Generate static sitemap
    await fs.writeFile('public/sitemaps/static.xml', generateStaticSitemap());

    // Generate timeline sitemaps
    for (let i = 0; i < sitemapCount; i++) {
      const start = i * (SITE_CONFIG.URLS_PER_SITEMAP / 2);
      const pageSlice = pageNames.slice(start, start + (SITE_CONFIG.URLS_PER_SITEMAP / 2));
      const timelineSitemap = generateTimelineSitemap(pageSlice);
      await fs.writeFile(`public/sitemaps/timelines-${i + 1}.xml`, timelineSitemap);
    }

    console.log(`Successfully generated sitemap files for ${pageNames.length} pages`);
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
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${pageName}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>${SITE_CONFIG.DOMAIN}/timeline/${pageName}/text</loc>
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