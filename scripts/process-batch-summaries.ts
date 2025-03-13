require("dotenv").config({ path: ".env.development.local" });
const { Redis } = require("@upstash/redis");
const fs = require("fs/promises");
const path = require("path");

// Initialize Redis
const redis = Redis.fromEnv();

interface WikiSummary {
  pageUrl: string;
  thumbnail?: string;
  summary?: string;
}

async function processSummariesFile(inputPath: string) {
  try {
    // Read and process the file
    const fileContent = await fs.readFile(inputPath, "utf-8");
    const summaries = JSON.parse(fileContent);

    for (const [pageName, data] of Object.entries(summaries)) {
      try {
        // Create cache key
        const cacheKey = `summary:${pageName}`;

        // Store in Redis
        await redis.set(cacheKey, data as WikiSummary);

        console.log(`Stored summary for ${pageName}`);
      } catch (error) {
        console.error(`Error processing summary for ${pageName}:`, error);
        continue;
      }
    }

    console.log("Finished processing all summaries");
  } catch (error) {
    console.error("Error reading or processing file:", error);
  }
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error("Please provide an input file path");
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), inputFile);
  await processSummariesFile(fullPath);
}

main();
