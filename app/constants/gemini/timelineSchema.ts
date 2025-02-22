import { SchemaType } from "@google/generative-ai";

export const TIMELINE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
      timeline: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: `Concise description that states the subject's name, years (if known), nationality/background, and primary significance.
             For events/periods, state what it is and its historical importance.
             For BCE dates in title, use BCE instead of negative years.`,
          },
          birthDate: {
            type: SchemaType.STRING,
            description: "Birth date of the person (YYYY-MM-DD, YYYY, or YYYY-MM format), if applicable and known. Only include if the subject is a person."
          },
          deathDate: {
            type: SchemaType.STRING,
            description: "Optional death date of the person (YYYY-MM-DD, YYYY, or YYYY-MM format), if applicable and known. Only include if the subject is a person."
          },
          events: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                headline: {
                  type: SchemaType.STRING,
                  description: "concise, self-contained title that clearly describes the event",
                },
                description: {
                  type: SchemaType.STRING,
                  description: `clear, concise description that:
                  - Summarizes the event in your own words
                  - Provides necessary context without relying on surrounding events
                  - Avoids direct quotes from Wikipedia
                  - Keeps to 1-2 sentences when possible`,
                },
                startDate: {
                  type: SchemaType.STRING,
                  description: `use the most precise date available, following these formats:
                  - YYYY for year only (e.g., '0220' or '-0220' for 220 BCE)
                  - YYYY-MM for year and month
                  - YYYY-MM-DD for full dates`,
                },
                endDate: {
                  type: SchemaType.STRING,
                  description: "End date of the event if it's a range, following the same format as startDate"
                }
              },
              required: ["headline", "description", "startDate"]
            }
          }
        },
        required: ["title", "events"]
      }
    },
    required: ["timeline"]
  };