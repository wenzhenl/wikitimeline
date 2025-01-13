import { AVAILABLE_FONTS } from "../constants/fonts";

export interface TimelinePreferences {
  font: string;
  // Add more preferences here as needed, such as:
  // colorScheme: string;
  // groupColors: Record<number, { color: string; textColor: string }>;
}

export type AvailableFont = typeof AVAILABLE_FONTS[number]['value'];

export interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

export interface WikiSummary {
  pageUrl: string;
  thumbnail?: string;
  summary?: string;
}

export interface PageTimeline {
  timeline: TimelineEvent[];
  wikiSummary: WikiSummary;
}

export interface TimelineAPIResponse {
  timelines: Record<string, PageTimeline>;
  errors?: {
    message: string;
    failedPages: string[];
    details?: {
      noWikipediaData: string[];
      noTimelineGenerated: string[];
    };
  };
}