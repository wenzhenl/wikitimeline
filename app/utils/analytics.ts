import { SITE_CONFIG } from "@/app/config/site";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Analytics event categories
export const ANALYTICS_CATEGORIES = {
  SEARCH: "search",
  LANGUAGE: "language",
  TIMELINE: "timeline",
} as const;

// Analytics event actions
export const ANALYTICS_ACTIONS = {
  SEARCH_QUERY: "search_query",
  URL_PASTE: "url_paste",
  LANGUAGE_CHANGE: "language_change",
  GENERATE_TIMELINE: "generate_timeline",
  SELECT_RESULT: "select_result",
  // Timeline customization actions
  CHANGE_FONT: "change_font",
  CHANGE_COLOR_SCHEME: "change_color_scheme",
  CHANGE_POSITION: "change_position",
  CHANGE_HEIGHT: "change_height",
  OPEN_CUSTOMIZER: "open_customizer",
  // Timeline controls actions
  OPEN_CONTROLS: "open_controls",
  EDIT_PAGES: "edit_pages",
  UPDATE_PAGES: "update_pages",
  // Timeline filter actions
  APPLY_DATE_FILTER: "apply_date_filter",
  APPLY_TOP_EVENTS_FILTER: "apply_top_events_filter",
  RESET_FILTERS: "reset_filters",
} as const;

export const trackEvent = (
  category: (typeof ANALYTICS_CATEGORIES)[keyof typeof ANALYTICS_CATEGORIES],
  action: (typeof ANALYTICS_ACTIONS)[keyof typeof ANALYTICS_ACTIONS],
  label?: string,
  value?: number
) => {
  if (
    typeof window !== "undefined" &&
    window.gtag &&
    SITE_CONFIG.GOOGLE_ANALYTICS_ID
  ) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}; 