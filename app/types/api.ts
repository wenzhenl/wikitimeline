export interface TimelineEvent {
  date: string;
  text: {
    headline: string;
    text: string;
  };
  group: string;
  media?: {
    url?: string;
    thumbnail?: string;
  };
}

export interface TimelineResponse {
  timeline: TimelineEvent[];
  errors?: {
    message: string;
    failedPages: string[];
    details?: {
      noWikipediaData: string[];
      noTimelineGenerated: string[];
    };
  };
}

// Additional API types
export interface WikipediaInfo {
  pageUrl: string;
  thumbnail?: string;
  summary?: string;
  error?: string;
}

export interface TimelineGenerationResult {
  date: string;
  headline: string;
  text: string;
} 