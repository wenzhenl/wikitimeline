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
    const lines = fileContent.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      try {
        const batchItem = JSON.parse(line);

        // Skip if there's an error or no response
        if (batchItem.error || !batchItem.response) {
          console.error(`Skipping ${batchItem.custom_id}: No valid response`);
          continue;
        }

        // Extract the timeline JSON from the response
        const assistantMessage =
          batchItem.response.body.choices[0].message.content;
        const timeline = JSON.parse(assistantMessage);

        // Create cache key from custom_id
        const cacheKey = `timeline:${batchItem.custom_id.replace("timeline-", "")}`;

        // Store in Redis
        await redis.set(cacheKey, JSON.stringify(timeline));
        console.log(`Stored timeline for ${cacheKey}`);
      } catch (error) {
        console.error("Error processing line:", error);
        continue;
      }
    }

    console.log("Finished processing all timelines");
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
  await processOutputFile(fullPath);
}

main();
