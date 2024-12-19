require('dotenv').config({ path: '.env.development.local' });
const wiki = require('wikipedia');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

let cachedSystemPrompt = '';

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(process.cwd(), 'app/prompts/timeline-generator.txt');
  try {
    const rawPrompt = await fs.readFile(promptPath, 'utf-8');
    cachedSystemPrompt = rawPrompt
      .replace(/\0/g, '')
      .replace(/\r\n/g, '\n')
      .trim();
    return cachedSystemPrompt;
  } catch (error) {
    console.error('Error reading system prompt:', error);
    throw error;
  }
}

async function processFile(inputPath: string, outputPath: string) {
  const systemPrompt = await getSystemPrompt();
  const fileStream = await fs.readFile(inputPath, 'utf-8');
  const pages = fileStream.split('\n').filter((line: string) => line.trim());
  
  const requests = [];
  
  for (const [index, pageName] of pages.entries()) {
    try {
      console.log(`Processing ${pageName}...`);
      const summary = await wiki.summary(pageName.trim());
      
      const request = {
        custom_id: `timeline-${pageName.trim()}`,
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Create a timeline for ${pageName.trim()} (${summary.extract})`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_completion_tokens: 2000,
        }
      };
      
      requests.push(JSON.stringify(request));
    } catch (error) {
      console.error(`Error processing ${pageName}:`, error);
    }
  }

  await fs.writeFile(outputPath, requests.join('\n'), 'utf-8');
  console.log(`Created batch file at ${outputPath}`);
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Please provide an input file path');
    process.exit(1);
  }

  const outputFile = path.join(process.cwd(), 'prompt-tests', 'batch-requests.jsonl');
  await fs.mkdir(path.join(process.cwd(), 'prompt-tests'), { recursive: true });
  
  await processFile(inputFile, outputFile);
}

main(); 