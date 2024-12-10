const fs = require('fs/promises');
const bz2 = require('unbzip2-stream');
const readline = require('readline');
const https = require('https');
import { IncomingMessage } from 'http';

async function downloadFile(url: string): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    https.get(url, (response: IncomingMessage) => {
      if (response.statusCode === 200) {
        resolve(response);
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function processDailyDump(date: string) {
  const url = `https://dumps.wikimedia.org/other/pageview_complete/2024/2024-11/pageviews-${date}-user.bz2`;
  const outputPath = `.data/daily/pageviews-${date}.json`;
  const pageViews = new Map<string, number>();

  try {
    console.log(`Downloading ${date}...`);
    const stream = await downloadFile(url);
    const fileStream = stream.pipe(bz2());

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const [project, article, _, platform, count] = line.split(' ');
      
      if (project === 'en.wikipedia' && 
          !article.startsWith('Special:') &&
          !article.startsWith('File:') &&
          !article.startsWith('Category:') &&
          !article.startsWith('Template:')) {
        
        const views = parseInt(count) || 0;
        pageViews.set(article, (pageViews.get(article) || 0) + views);
      }
    }

    const sortedPages = Array.from(pageViews.entries())
      .map(([title, views]) => ({ title, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 100000);

    await fs.promises.writeFile(outputPath, JSON.stringify(sortedPages, null, 2));
    console.log(`Processed ${date}, saved ${sortedPages.length} pages`);
    
  } catch (error) {
    console.error(`Error processing ${date}:`, error);
  }
}

// Process last 30 days
async function main() {
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    await processDailyDump(dateStr);
    // Wait between requests to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch(console.error); 