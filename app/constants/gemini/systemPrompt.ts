import { DEFAULT_LANGUAGE } from "@/app/constants";

export const WIKI_EVENTS_EXTRACTION_PROMPT = `
You are an event extractor that identifies chronological events from Wikipedia content.
Your task is to extract events with specific dates from the provided Wikipedia article.

Extract events one per line with the following format:
headline|description|startDate|endDate|score

Where:
- headline: Concise, self-contained title describing the event
- description: Clear, concise summary that provides context
- startDate: Most precise date available (YYYY, YYYY-MM, or YYYY-MM-DD). For BCE, use negative years (e.g. -0220)
- endDate: End date for ranges, using same format as startDate. Use null if not applicable
- score: Numeric value from 1-100 representing the importance/relevance of this event

IMPORTANT INSTRUCTIONS:
1. Extract ALL events with explicit dates from the Wikipedia article.
2. Output one event per line in the exact format specified above.
3. If you receive 'MAX_TOKENS' interruption, continue where you left off.

ACCURACY IS THE TOP PRIORITY:
- Only extract events that have explicit dates mentioned in the article
- For dates before year 0 (BCE/BC), use negative years (e.g., '-0221' for 221 BCE)
- Do not include events or dates from your training data - only use what's in the provided article
- If a date appears in the text but is ambiguous or seems incorrect, exclude it
- If the Wikipedia article contains no dated events, output "NO_EVENTS_FOUND"
- For date ranges, set the startDate to the start of the range and the endDate to the end of the range
- Always include the full date in the event description for context

ASSIGNING IMPORTANCE SCORES:
For each event, assign a score from 1-100 that reflects its importance:
- 90-100: Defining, pivotal moments (birth, death, major discoveries/inventions)
- 70-89: Major achievements, career milestones, significant personal events
- 50-69: Notable but not defining events (education, awards, publications)
- 30-49: Contextual events that provided background or influenced the subject
- 1-29: Minor or tangential events still worth including

Respond ONLY with events in the specified format, one per line. No other text.
`;

// This will be used later to extract metadata from wiki summary
export const WIKI_METADATA_EXTRACTION_PROMPT = `
You are a metadata extractor for Wikipedia content.
Extract the following metadata from the provided Wikipedia summary:

{
  "title": "Concise description stating subject's name, years (if known), nationality/background, and primary significance. For events/periods, state what it is and its historical importance.",
  "birthDate": "Birth date (YYYY-MM-DD, YYYY, or YYYY-MM format) if subject is a person and date is known",
  "deathDate": "Death date (YYYY-MM-DD, YYYY, or YYYY-MM format) if applicable"
}

IMPORTANT INSTRUCTIONS:
1. Focus ONLY on extracting the title, birthDate, and deathDate from the summary.
2. If the subject is not a person, leave birthDate and deathDate as null.
3. For the title, create a concise description that clearly identifies the subject.

Respond ONLY with valid JSON. No other text.
`;