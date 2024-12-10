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

    // Convert Map to array of objects, sort by views descending
    const allPages = Array.from(pageViews.entries())
      .map(([title, views]) => ({ title, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 100000);

    // Log interesting rank positions
    const logRank = (rank: number) => {
      if (rank < allPages.length) {
        console.log(`Rank ${rank}: ${allPages[rank].title} (${allPages[rank].views.toLocaleString()} views)`);
      }
    };

    // Log ranks: 1, 10, 100, 1000, 10000, 100000, 1000000
    [1, 10, 100, 1000, 10000, 100000, 1000000].forEach(rank => logRank(rank - 1));

    await fs.promises.writeFile(outputPath, JSON.stringify(allPages, null, 2));
    //console.log(`Processed ${date}, saved ${allPages.length} pages`);
    
  } catch (error) {
    console.error(`Error processing ${date}:`, error);
  }
}

// Helper function to get random days from a month
function getRandomDays(year: string, month: string, count: number): string[] {
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
  
  // Shuffle array and take first 'count' elements
  return days
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(day => `${year}${month}${day.toString().padStart(2, '0')}`)
    .sort(); // Sort dates for chronological processing
}

// Modify main function to handle a single month
async function main() {
  const month = process.argv[2];
  
  // Validate month input
  if (!month || !/^(0[1-9]|1[0-1])$/.test(month)) {
    console.error('Please provide a valid month (01-11)');
    process.exit(1);
  }

  const randomDates = getRandomDays('2024', month, 3);
  
  for (const dateStr of randomDates) {
    await processDailyDump(dateStr);
    // Wait between requests to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run with month argument
main().catch(console.error); 