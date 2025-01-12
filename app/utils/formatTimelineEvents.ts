import { TimelineEvent } from "../timeline/[pageName]/page";
import { COLOR_SCHEMES } from "../constants/colorSchemes";

export function formatTimelineEvents(events: TimelineEvent[], colorSchemeId = 'default') {
  const groupIndices = new Map<string, number>();
  const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === colorSchemeId) || COLOR_SCHEMES[0];

  return events.map((event) => {
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
    if (!groupIndices.has(event.group)) {
      groupIndices.set(event.group, groupIndices.size);
    }
    const groupIndex = groupIndices.get(event.group)!;
    const colorIndex = groupIndex % Object.keys(colorScheme.colors).length;
    const colors = colorScheme.colors[colorIndex as keyof typeof colorScheme.colors];

    return {
      start_date: { year, month, day },
      text: {
        headline: `<span style="color: ${colors.textColor}; font-weight: 600; text-shadow: none;">${event.text.headline}</span>`,
        text: `<span style="color: ${colors.textColor}; text-shadow: none;">${event.text.text}</span>`,
      },
      group: event.group,
      media: event.media,
      background: {
        color: colors.color,
      },
    };
  });
} 