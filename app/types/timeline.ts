export interface TimelineEvent {
  headline: string;
  description: string;
  startDate: string;
  endDate?: string;
  age?: number;
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

export interface TimelineWithWikiSummary {
  timeline: Timeline;
  wikiSummary: WikiSummary;
}

export interface TimelineAPIResponse {
  timelines: Record<string, TimelineWithWikiSummary>;
  errors?: {
    message: string;
    failedPages: string[];
    details?: {
      noWikipediaData: string[];
      noTimelineGenerated: string[];
    };
  };
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
  scale?: 'human' | 'cosmological';
}