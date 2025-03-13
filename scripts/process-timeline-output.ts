require("dotenv").config({ path: ".env.development.local" });
const { Redis } = require("@upstash/redis");
const fs = require("fs/promises");
const path = require("path");

// Initialize Redis
const redis = Redis.fromEnv();

async function processOutputFile(inputPath: string) {
  try {
    // Read and process the file
    const fileContent = await fs.readFile(inputPath, "utf-8");
    const data = JSON.parse(fileContent);

    // Extract page name from filename (remove model suffix and .json)
    const filename = path.basename(inputPath);
    const pageName = filename.replace(/-(?:deepseek|gemini)\.json$/, "");

    // Create cache key
    const cacheKey = `timeline:${pageName}`;

    // Store timeline data in Redis
    await redis.set(cacheKey, JSON.stringify(data));
    console.log(`Stored timeline for ${cacheKey}`);
  } catch (error) {
    console.error("Error processing file:", error);
  }
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error("Please provide an input file path");
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), inputFile);
  await processOutputFile(fullPath);
}

main();
