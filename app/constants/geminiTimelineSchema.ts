import { SchemaType } from "@google/generative-ai";

export const GEMINI_TIMELINE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
      timeline: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Brief description of the timeline subject",
          },
          birthDate: {
            type: SchemaType.STRING,
            description: "Birth date of the person (YYYY-MM-DD, YYYY, or YYYY-MM format), if applicable and known"
          },
          deathDate: {
            type: SchemaType.STRING,
            description: "Death date of the person (YYYY-MM-DD, YYYY, or YYYY-MM format), if applicable and known"
          },
          events: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                headline: {
                  type: SchemaType.STRING,
                  description: "Short headline of the event",
                },
                description: {
                  type: SchemaType.STRING,
                  description: "Detailed description of the event",
                },
                startDate: {
                  type: SchemaType.STRING,
                  description: "Start date of the event (YYYY-MM-DD, YYYY, or YYYY-MM format)",
                },
                endDate: {
                  type: SchemaType.STRING,
                  description: "End date of the event if it's a range (YYYY-MM-DD, YYYY, or YYYY-MM format)"
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