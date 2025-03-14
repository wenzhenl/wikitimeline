import { SchemaType } from "@google/generative-ai";

export const WIKI_EVENTS_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      headline: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      startDate: { type: SchemaType.STRING },
      score: { type: SchemaType.INTEGER },
    },
    required: ["headline", "description", "startDate", "score"],
  },
};

export const WIKI_METADATA_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    birthDate: { type: SchemaType.STRING },
    deathDate: { type: SchemaType.STRING },
  },
  required: ["title"],
};
