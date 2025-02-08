require('dotenv').config({ path: '.env.development.local' });
const { promises: fs } = require('fs');
const path = require('path');

const SITE_CONFIG = {
  DOMAIN: 'https://wiki-timeline.com'
};

/**
 * How to run:
 * npx ts-node scripts/batch_populate.ts [input-file]
 * 
 * Example:
 * npx ts-node scripts/batch_populate.ts input.txt
 * 
 * Input file should contain one Wikipedia page name per line
 */

async function populateTimeline(page: string): Promise<void> {
  try {
    console.log(`Processing: ${page}`);
    
    // Use your website's endpoint
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${encodeURIComponent(page)}`,
      { cache: 'no-store' }  // Ensure fresh data
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline for ${page}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully processed: ${page}`);
    // console.log('Response:', JSON.stringify(data, null, 2));
    
    // Add delay between requests to avoid rate limiting
    console.log('Waiting 1 second before next request...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`Error processing ${page}:`, error);
  }
}

async function main() {
  const [,, inputFile = 'input.txt'] = process.argv;

  if (!inputFile) {
    console.error('Please provide an input file path as an argument');
    process.exit(1);
  }

  try {
    // Read and parse input file
    const filePath = path.resolve(process.cwd(), inputFile);
    console.log(`Reading pages from: ${filePath}`);
    
    const pages = (await fs.readFile(filePath, 'utf-8'))
      .split('\n')
      .filter((line: string) => Boolean(line))
      .map((line: string) => line.trim());

    console.log(`Found ${pages.length} pages to process\n`);

    // Process pages sequentially
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`[${i + 1}/${pages.length}] Starting ${page}`);
      await populateTimeline(page);  // Wait for each page to complete
    }

    console.log('All pages processed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 