import { AVAILABLE_FONTS } from "../constants/fonts";

export interface TimelinePreferences {
  font: string;
  // Add more preferences here as needed, such as:
  // colorScheme: string;
  // groupColors: Record<number, { color: string; textColor: string }>;
}

export type AvailableFont = typeof AVAILABLE_FONTS[number]['value']; 