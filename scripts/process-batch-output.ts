require('dotenv').config({ path: '.env.development.local' });
import { createClient } from 'redis';
import * as fs from 'fs/promises';
import * as path from 'path';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function processOutputFile(inputPath: string) {
  // Initialize Redis client
  const client = createClient({
    url: REDIS_URL
  });

  client.on('error', err => console.error('Redis Client Error', err));
  await client.connect();

  try {
    // Read and process the file
    const fileContent = await fs.readFile(inputPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

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
        
        // Store in Redis
        await client.set(cacheKey, JSON.stringify(timeline));
        console.log(`Stored timeline for ${cacheKey}`);
      } catch (error) {
        console.error('Error processing line:', error);
        continue;
      }
    }

    console.log('Finished processing all timelines');
  } catch (error) {
    console.error('Error reading or processing file:', error);
  } finally {
    await client.quit();
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