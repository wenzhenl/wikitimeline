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
export interface TimelineJSEvent {
  start_date: {
    year: number;
    month?: number;
    day?: number;
  };
  text: {
    headline: string;
    text: string;
  };
  group?: string;
  media?: {
    url?: string;
    thumbnail?: string;
  };
  background?: {
    color: string;
  };
}

export interface TimelineData {
  events: TimelineJSEvent[];
  scale?: 'human' | 'cosmological';
}