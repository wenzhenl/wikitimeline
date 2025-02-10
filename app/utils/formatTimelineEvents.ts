import { PageTimeline } from "@/app/types/timeline";
import { COLOR_SCHEMES } from "../constants/colorSchemes";
import { TimelineData } from "@/app/types/timeline";

function formatGroupName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

function formatCosmologicalDate(year: number): string {
  const absYear = Math.abs(year);
  
  // Handle dates within human range differently
  if (absYear <= 275760) {
    const formattedYear = absYear >= 10000 ? absYear.toLocaleString() : absYear.toString();
    return year < 0 ? `${formattedYear} BCE` : formattedYear;
  }
  
  // Format cosmological dates
  let display = '';
  if (absYear >= 1_000_000_000) {
    display = `${(absYear / 1_000_000_000).toFixed(1)} billion`;
  } else if (absYear >= 1_000_000) {
    display = `${(absYear / 1_000_000).toFixed(1)} million`;
  } else {
    display = absYear.toLocaleString();
  }
  
  const suffix = year < 0 ? 'YEARS AGO' : 'YEARS IN THE FUTURE';
  return `<span style="font-weight: 700;">${display.toUpperCase()} ${suffix}</span>`;
}

export function formatTimelineEventsForInteractive(
  timelines: Record<string, PageTimeline>, 
  colorSchemeId = 'default'
): TimelineData {
  const groupIndices = new Map<string, number>();
  const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === colorSchemeId) || COLOR_SCHEMES[0];

  // Merge and format all events from all timelines
  const allEvents = Object.entries(timelines).flatMap(([pageName, pageData]) => {
    // Only add group if there are multiple pages
    const hasMultiplePages = Object.keys(timelines).length > 1;
    
    return pageData.timeline.map(event => ({
      ...event,
      ...(hasMultiplePages && { group: formatGroupName(pageName) }), // Conditionally add group
      ...(pageData.wikiSummary?.thumbnail && {  // Only add media if thumbnail exists
        media: {
          thumbnail: pageData.wikiSummary.thumbnail
        }
      })
    }));
  });

  // Check if any dates are outside human scale range (-271821 to 275760)
  const needsCosmologicalScale = Object.values(timelines).some(pageData =>
    pageData.timeline.some(event => {
      const year = parseInt(event.date.startsWith("-") ? event.date.slice(1) : event.date);
      return event.date.startsWith("-") ? year > 271821 : year > 275760;
    })
  );

  return {
    events: allEvents.map((event) => {
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
        ...(needsCosmologicalScale && {
          display_date: formatCosmologicalDate(year)
        }),
        text: {
          headline: `<span style="color: ${colors.textColor}; font-weight: 600; text-shadow: none;">${event.headline}</span>`,
          text: `<span style="color: ${colors.textColor}; text-shadow: none;">${event.text}</span>`,
        },
        group: event.group,
        ...(event.media && { media: event.media }), // Only include media if it exists
        background: {
          color: colors.color,
        },
      };
    }),
    ...(needsCosmologicalScale && { scale: 'cosmological' as const })
  };
} 