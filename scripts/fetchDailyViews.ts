const fs = require('fs');
const bz2 = require('unbzip2-stream');
const readline = require('readline');
const https = require('https');
const { IncomingMessage } = require('http');

async function downloadFile(url: string): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    https.get(url, (response: typeof IncomingMessage) => {
      if (response.statusCode === 200) {
        resolve(response);
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function processDailyDump(date: string) {
  // Extract year, month, day from the date string (format: YYYYMMDD)
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  
  const url = `https://dumps.wikimedia.org/other/pageview_complete/${year}/${year}-${month}/pageviews-${date}-user.bz2`;
  console.log(url);
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
async function main(yearMonth?: string) {
  // If no yearMonth provided, use current month
  if (!yearMonth) {
    const today = new Date();
    yearMonth = today.toISOString().slice(0, 7);
  }

  const [year, month] = yearMonth.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}${month}${day.toString().padStart(2, '0')}`;
    await processDailyDump(dateStr);
    // Wait between requests to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Update the script execution to accept command line argument
const yearMonth = process.argv[2]; // e.g., "2024-11"
main(yearMonth).catch(console.error); 