export interface TimelineEvent {
  headline: string;
  description: string;
  startDate: string;
  age?: number;
  score: number; // Importance/relevance score from 1-100
}

export interface Timeline {
  title: string;
  events: TimelineEvent[];
  birthDate?: string;
  deathDate?: string;
  isDead?: boolean;
  lastUpdatedAt?: number; // Unix timestamp in milliseconds
  version?: string;
}

export interface WikiSummary {
  pageUrl: string;
  thumbnail?: string;
  summary?: string;
}

export type TimelinePageStatus = "success" | "not_found" | "error";

export interface TimelinePageResult {
  status: TimelinePageStatus;
  message?: string; // Explains status: "Page does not exist", "No dated events found", or error message
  timeline?: Timeline;
  wikiSummary?: WikiSummary;
}

export interface TimelineAPIResponse {
  results: Record<string, TimelinePageResult>;
  metadata: {
    totalPages: number;
    successfulPages: number;
  };
}

// System error response type
export interface TimelineSystemError {
  error: "system_error";
  message: string;
}

// Interface for TimelineJS format
export interface TimelineJSDate {
  year: number;
  month?: number;
  day?: number;
}

export interface TimelineJSEvent {
  start_date?: TimelineJSDate;
  end_date?: TimelineJSDate;
  display_date?: string;
  text: {
    headline: string;
    text: string;
  };
  media?: {
    url?: string;
    thumbnail?: string;
  };
  group?: string;
  background?: {
    color: string;
  };
  unique_id?: string;
}

export interface TimelineJSTimeline {
  events: TimelineJSEvent[];
  title?: TimelineJSEvent;
  scale?: "human" | "cosmological";
}
