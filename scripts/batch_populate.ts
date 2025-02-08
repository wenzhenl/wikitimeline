async function populateTimeline(page: string) {
  try {
    console.log(`Processing: ${page}`);
    
    // Use your website's endpoint instead of direct Wikipedia/Gemini calls
    const response = await fetch(
      `${SITE_CONFIG.DOMAIN}/api/timeline/${encodeURIComponent(page)}`,
      { cache: 'no-store' }  // Ensure fresh data
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline for ${page}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully processed: ${page}`);
    
    // Optional: Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return data;
  } catch (error) {
    console.error(`Error processing ${page}:`, error);
    return null;
  }
}

// Process pages from input file
async function main() {
  const pages = fs.readFileSync('input.txt', 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => line.trim());

  for (const page of pages) {
    await populateTimeline(page);
  }
}

main(); 