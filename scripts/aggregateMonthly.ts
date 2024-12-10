async function aggregateMonthlyData() {
  const monthlyViews = new Map<string, { title: string; totalViews: number; appearances: number }>();
  const dailyFiles = await fs.promises.readdir('.data/daily');

  for (const file of dailyFiles) {
    if (!file.endsWith('.json')) continue;
    
    const data = JSON.parse(await fs.promises.readFile(`.data/daily/${file}`, 'utf8'));
    
    data.forEach((page: { title: string; views: number }) => {
      if (page.views >= 10000) {
        if (!monthlyViews.has(page.title)) {
          monthlyViews.set(page.title, {
            title: page.title,
            totalViews: page.views,
            appearances: 1
          });
        } else {
          const existing = monthlyViews.get(page.title)!;
          existing.totalViews += page.views;
          existing.appearances += 1;
        }
      }
    });
  }

  const sortedPages = Array.from(monthlyViews.values())
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 100000);

  await fs.promises.writeFile(
    '.data/monthly/top_wikipedia_pages.json',
    JSON.stringify(sortedPages, null, 2)
  );

  console.log(`Aggregated ${dailyFiles.length} days into monthly data`);
}

aggregateMonthlyData().catch(console.error); 