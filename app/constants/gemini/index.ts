// General Gemini settings
export const MAX_CHUNK_SIZE = 10000;
export const TEMPERATURE = 1;
export const DEFAULT_MODEL = "gemini-2.0-flash";

export function getGeminiModel(version: string = "1"): string {
  if (version === "1") {
    return "gemini-2.0-flash";
  } else {
    return DEFAULT_MODEL;
  }
}