import { TimelineJSDate, TimelineWithWikiSummary } from "@/app/types/timeline";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";
import { TimelineJSTimeline } from "@/app/types/timeline";

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
  timelines: Record<string, TimelineWithWikiSummary>, 
  colorSchemeId = 'default'
): TimelineJSTimeline {
  const groupIndices = new Map<string, number>();
  const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === colorSchemeId) || COLOR_SCHEMES[0];

  // Get the first color from the scheme
  const firstGroupColors = colorScheme.colors[0];

  // Merge and format all events from all timelines
  const allEvents = Object.entries(timelines).flatMap(([pageName, pageData]) => {
    // Only add group if there are multiple pages
    const hasMultiplePages = Object.keys(timelines).length > 1;
    
    return pageData.timeline.events.map(event => ({
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
    pageData.timeline.events.some(event => {
      const year = parseInt(event.startDate.startsWith("-") ? event.startDate.slice(1) : event.startDate);
      return event.startDate.startsWith("-") ? year > 271821 : year > 275760;
    })
  );

  const isMultiplePages = Object.keys(timelines).length > 1;
  const pageNames = Object.keys(timelines).map(name => formatGroupName(name));

  return {
    title: {
      text: {
        headline: isMultiplePages
          ? `<span style="color: ${firstGroupColors.textColor}; font-weight: 600; text-shadow: none;">Comparative Timeline</span>`
          : `<span style="color: ${firstGroupColors.textColor}; font-weight: 600; text-shadow: none;">Interactive Timeline of ${pageNames[0]}</span>`,
        text: isMultiplePages
          ? `<span style="color: ${firstGroupColors.textColor}; font-size: 0.9em; text-shadow: none;">${pageNames.join(' vs. ')}</span>`
          : `<span style="color: ${firstGroupColors.textColor}; font-size: 0.9em; text-shadow: none;">${Object.values(timelines)[0].timeline.title}</span>`
      },
      background: {
        color: firstGroupColors.color
      }
    },
    events: allEvents.map((event) => {
      // Assign a consistent index to each group
      const groupKey = event.group || 'default';
      if (!groupIndices.has(groupKey)) {
        groupIndices.set(groupKey, groupIndices.size);
      }
      const groupIndex = groupIndices.get(groupKey)!;
      const colorIndex = groupIndex % Object.keys(colorScheme.colors).length;
      const colors = colorScheme.colors[colorIndex as keyof typeof colorScheme.colors];

      const startDate = parseDate(event.startDate);
      const endDate = event.endDate ? parseDate(event.endDate) : undefined;

      return {
        start_date: startDate,
        //...(endDate && { end_date: endDate }), // Only include if endDate exists
        ...(needsCosmologicalScale && {
          display_date: formatCosmologicalDate(startDate.year)
        }),
        text: {
          headline: `<span style="color: ${colors.textColor}; font-weight: 600; text-shadow: none;">${event.headline}</span>`,
          text: `${event.age ? `<span style="color: ${colors.textColor}; text-shadow: none;"> [ Age ${event.age} ]</span><br/><br/>` : ''}
                <span style="color: ${colors.textColor}; text-shadow: none;">${event.description}</span>`,
        },
        group: event.group,
        ...(event.media && { media: event.media }),
        background: {
          color: colors.color,
        },
        //unique_id: event.headline
      };
    }),
    ...(needsCosmologicalScale && { scale: 'cosmological' as const }),
    
  };
}

// Helper function to parse date string into TimelineJSDate
function parseDate(dateStr: string): TimelineJSDate {
  const isNegativeYear = dateStr.startsWith("-");
  const normalizedDate = isNegativeYear ? dateStr.slice(1) : dateStr;
  const dateParts = normalizedDate.split("-");

  const initialYear = parseInt(dateParts[0]) || 0;
  const year = isNegativeYear ? -initialYear : initialYear;
  const month = dateParts[1] ? parseInt(dateParts[1]) : undefined;
  const day = dateParts[2] ? parseInt(dateParts[2]) : undefined;

  return { year, month, day };
} 