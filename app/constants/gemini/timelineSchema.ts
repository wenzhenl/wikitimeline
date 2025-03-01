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
              endDate: { type: SchemaType.STRING },
              score: { type: SchemaType.INTEGER }
            },
            required: ["headline", "description", "startDate", "score"]
          }
        }
      },
      required: ["events"]
    }
  },
  required: ["timeline"]
};