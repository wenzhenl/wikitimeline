const bz2 = require('unbzip2-stream');
const readline = require('readline');

interface PageView {
  project: string;
  article: string;
  views: number;
}

interface PageStats {
  title: string;
  totalViews: number;
}

async function processWikiDump(filePath: string) {
  const pageViews = new Map<string, number>();

  const fileStream = fs.createReadStream(filePath)
    .pipe(bz2());

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const [project, article, _, platform, count] = line.split(' ');
    
    // Only process English Wikipedia articles
    if (project === 'en.wikipedia') {
      // Filter out non-articles
      if (!article.startsWith('Special:') &&
          !article.startsWith('File:') &&
          !article.startsWith('Category:') &&
          !article.startsWith('Template:')) {
        
        const views = parseInt(count) || 0;
        pageViews.set(
          article,
          (pageViews.get(article) || 0) + views
        );
      }
    }
  }

  // Convert to array and sort
  const sortedPages = Array.from(pageViews.entries())
    .map(([title, views]) => ({ title, totalViews: views }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 100000);

  // Save results
  await fs.promises.writeFile(
    'top_wikipedia_pages.json',
    JSON.stringify(sortedPages, null, 2)
  );

  console.log(`Processed ${pageViews.size} pages, saved top 100K to file`);
}

// Run the script
const dumpFile = process.argv[2] || 'pageviews-20241208-user.bz2';
processWikiDump(dumpFile).catch(console.error); 