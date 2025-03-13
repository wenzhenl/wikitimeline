require("dotenv").config({ path: ".env.development.local" });
const wiki = require("wikipedia");
const fs = require("fs").promises;
const path = require("path");
const readline = require("readline");

let cachedSystemPrompt = "";

interface WikiSummaries {
  [key: string]: {
    pageUrl: string;
    thumbnail?: string;
    summary: string;
  };
}

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(
    process.cwd(),
    "app/prompts/timeline-generator.txt",
  );
  try {
    const rawPrompt = await fs.readFile(promptPath, "utf-8");
    cachedSystemPrompt = rawPrompt
      .replace(/\0/g, "")
      .replace(/\r\n/g, "\n")
      .trim();
    return cachedSystemPrompt;
  } catch (error) {
    console.error("Error reading system prompt:", error);
    throw error;
  }
}

async function processFile(
  inputPath: string,
  batchPath: string,
  summaryPath: string,
) {
  const systemPrompt = await getSystemPrompt();
  console.log(systemPrompt);
  const fileStream = await fs.readFile(inputPath, "utf-8");
  const pages = fileStream
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line);

  console.log("Raw fileStream:", fileStream);
  console.log("Parsed pages:", pages);
  console.log(`Found ${pages.length} pages to process`);

  const requests = [];
  const wikiSummaries: WikiSummaries = {};

  for (const pageName of pages) {
    try {
      console.log(`Processing ${pageName}...`);
      const summary = await wiki.summary(pageName.trim());
      console.log(`Successfully got summary for ${pageName}`);

      // Store wiki summary
      wikiSummaries[pageName.trim()] = {
        pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageName.trim())}`,
        thumbnail: summary.thumbnail?.source,
        summary: summary.extract,
      };

      const request = {
        custom_id: `timeline-${pageName.trim()}`,
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Create a timeline for ${pageName.trim()} (${summary.extract})`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_completion_tokens: 2000,
        },
      };

      requests.push(JSON.stringify(request));
      console.log(`Added request for ${pageName}`);
    } catch (error) {
      console.error(`Error processing ${pageName}:`, error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Stack trace:", error.stack);
      }
    }
  }

  // Save batch requests
  console.log(`Generated ${requests.length} requests`);
  await fs.writeFile(batchPath, requests.join("\n"), "utf-8");
  console.log(`Created batch file at ${batchPath}`);

  // Save wiki summaries
  await fs.writeFile(
    summaryPath,
    JSON.stringify(wikiSummaries, null, 2),
    "utf-8",
  );
  console.log(`Saved wiki summaries to ${summaryPath}`);
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error("Please provide an input file path");
    process.exit(1);
  }

  // Create output paths based on input file name
  const inputBaseName = path.basename(inputFile, path.extname(inputFile));
  console.log(inputBaseName);
  const outputDir = path.join(process.cwd(), "prompt-tests");
  const batchFile = path.join(outputDir, `${inputBaseName}-batch.jsonl`);
  const summaryFile = path.join(outputDir, `${inputBaseName}-summary.json`);

  await fs.mkdir(outputDir, { recursive: true });
  await processFile(inputFile, batchFile, summaryFile);
}

main();
