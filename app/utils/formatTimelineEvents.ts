import { PageTimeline } from "@/app/types/timeline";
import { COLOR_SCHEMES } from "../constants/colorSchemes";
import { TimelineJSEvent } from "@/app/types/timeline";

function formatGroupName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

export function formatTimelineEventsForInteractive(
  timelines: Record<string, PageTimeline>, 
  colorSchemeId = 'default'
): TimelineJSEvent[] {
  const groupIndices = new Map<string, number>();
  const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === colorSchemeId) || COLOR_SCHEMES[0];

  // Merge and format all events from all timelines
  const allEvents = Object.entries(timelines).flatMap(([pageName, pageData]) => {
    // Only add group if there are multiple pages
    const hasMultiplePages = Object.keys(timelines).length > 1;
    
    return pageData.timeline.map(event => ({
      ...event,
      ...(hasMultiplePages && { group: formatGroupName(pageName) }), // Conditionally add group
      media: {
        thumbnail: pageData.wikiSummary.thumbnail
      }
    }));
  });

  return allEvents.map((event) => {
    // Check if it's a negative year first
    const isNegativeYear = event.date.startsWith("-");
    const normalizedDate = isNegativeYear ? event.date.slice(1) : event.date;
    const dateParts = normalizedDate.split("-");

    // Handle partial dates
    const initialYear = parseInt(dateParts[0]) || 0;
    const month = dateParts[1] ? parseInt(dateParts[1]) : undefined;
    const day = dateParts[2] ? parseInt(dateParts[2]) : undefined;

    // Convert year back to negative if needed
    const year = isNegativeYear ? -initialYear : initialYear;

    // Assign a consistent index to each group
    const groupKey = event.group || 'default';
    if (!groupIndices.has(groupKey)) {
      groupIndices.set(groupKey, groupIndices.size);
    }
    const groupIndex = groupIndices.get(groupKey)!;
    const colorIndex = groupIndex % Object.keys(colorScheme.colors).length;
    const colors = colorScheme.colors[colorIndex as keyof typeof colorScheme.colors];

    return {
      start_date: { year, month, day },
      text: {
        headline: `<span style="color: ${colors.textColor}; font-weight: 600; text-shadow: none;">${event.headline}</span>`,
        text: `<span style="color: ${colors.textColor}; text-shadow: none;">${event.text}</span>`,
      },
      group: event.group,
      media: event.media,
      background: {
        color: colors.color,
      },
    };
  });
} 