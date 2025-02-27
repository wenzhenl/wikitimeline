import { SchemaType } from "@google/generative-ai";

export const TIMELINE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
      timeline: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          birthDate: { type: SchemaType.STRING },
          deathDate: { type: SchemaType.STRING },
          events: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                headline: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                startDate: { type: SchemaType.STRING },
                endDate: { type: SchemaType.STRING }
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

export const INCREMENTAL_TIMELINE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    timelineFragment: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        birthDate: { type: SchemaType.STRING },
        deathDate: { type: SchemaType.STRING },
        events: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              headline: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              startDate: { type: SchemaType.STRING },
              endDate: { type: SchemaType.STRING }
            },
            required: ["headline", "description", "startDate"]
          }
        },
        isComplete: { type: SchemaType.BOOLEAN }
      },
      required: ["title", "events", "isComplete"]
    }
  },
  required: ["timelineFragment"]
};