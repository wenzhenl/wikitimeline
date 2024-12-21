require('dotenv').config({ path: '.env.development.local' });
const { Redis } = require('@upstash/redis');
const fs = require('fs/promises');
const path = require('path');

// Initialize Redis
const redis = Redis.fromEnv();

async function processOutputFile(inputPath: string) {
  try {
    // Read and process the file
    const fileContent = await fs.readFile(inputPath, 'utf-8');
    const lines = fileContent.split('\n').filter((line: string) => line.trim());

    // Create batches of 100 operations
    const BATCH_SIZE = 100;
    let batch = [];
    
    for (const line of lines) {
      try {
        const batchItem = JSON.parse(line);
        
        // Skip if there's an error or no response
        if (batchItem.error || !batchItem.response) {
          console.error(`Skipping ${batchItem.custom_id}: No valid response`);
          continue;
        }

        // Extract the timeline JSON from the response
        const assistantMessage = batchItem.response.body.choices[0].message.content;
        const timeline = JSON.parse(assistantMessage);

        // Create cache key from custom_id
        const cacheKey = `timeline:${batchItem.custom_id.replace('timeline-', '')}`;
        
        // Add to batch instead of immediate write
        batch.push([cacheKey, JSON.stringify(timeline)]);
        
        // When batch is full or it's the last item, execute the batch
        if (batch.length >= BATCH_SIZE || line === lines[lines.length - 1]) {
          const pipeline = redis.pipeline();
          for (const [key, value] of batch) {
            pipeline.set(key, value);
          }
          await pipeline.exec();
          console.log(`Stored batch of ${batch.length} timelines`);
          batch = []; // Clear the batch
        }
      } catch (error) {
        console.error('Error processing line:', error);
        continue;
      }
    }

    console.log('Finished processing all timelines');
  } catch (error) {
    console.error('Error reading or processing file:', error);
  }
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Please provide an input file path');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), inputFile);
  await processOutputFile(fullPath);
}


main(); 