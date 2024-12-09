const fs = require('fs/promises');

interface WikiPageView {
  article: string;
  views: number;
  rank: number;
}

interface WikiResponse {
  items: Array<{
    articles: WikiPageView[];
  }>;
}

interface PageStats {
  title: string;
  totalViews: number;
  appearances: number;
}

async function getTopWikipediaPages(year: number, month: number, limit: number = 1000) {
  // Format month to 2 digits
  const monthStr = month.toString().padStart(2, '0');
  
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${year}/${monthStr}/all-days`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as WikiResponse;
    
    // Filter out special pages, files, etc.
    const articles = data.items[0].articles
      .filter((article: WikiPageView) => {
        const title = article.article;
        return !title.startsWith('Special:') &&
               !title.startsWith('File:') &&
               !title.startsWith('Wikipedia:') &&
               !title.startsWith('Template:') &&
               !title.startsWith('Help:') &&
               !title.startsWith('User:') &&
               !title.startsWith('Portal:');
      })
      .slice(0, limit);

    return articles.map((article: WikiPageView) => ({
      title: article.article,
      views: article.views,
      rank: article.rank
    }));
  } catch (error) {
    console.error('Error fetching top pages:', error);
    return [];
  }
}

async function main() {
  // Get top pages for the last 12 months
  const pages = new Map<string, PageStats>(); // Use Map to deduplicate

  for (let month = 1; month <= 12; month++) {
    console.log(`Fetching data for month ${month}...`);
    const monthlyPages = await getTopWikipediaPages(2024, month, 10000);
    
    monthlyPages.forEach((page) => {
      if (!pages.has(page.title)) {
        pages.set(page.title, {
          title: page.title,
          totalViews: page.views,
          appearances: 1
        });
      } else {
        const existing = pages.get(page.title)!;
        existing.totalViews += page.views;
        existing.appearances += 1;
      }
    });

    // Wait a bit to not overwhelm the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Convert to array and sort by total views
  const sortedPages = Array.from(pages.values())
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 100000);

  // Save to file
  await fs.writeFile(
    'top_wikipedia_pages.json',
    JSON.stringify(sortedPages, null, 2)
  );

  console.log(`Saved ${sortedPages.length} pages to top_wikipedia_pages.json`);
}

main().catch(console.error); 