import { TimelineJSDate, TimelineWithWikiSummary } from "@/app/types/timeline";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";
import { TimelineJSTimeline } from "@/app/types/timeline";
import logger from "@/app/utils/logger";
import { PAGE_NAME_SEPARATOR } from "@/app/constants";

function formatGroupName(name: string): string {
  // Strip language prefix if present (e.g., "zh:::PageName" becomes "PageName")
  const separatorIndex = name.indexOf(PAGE_NAME_SEPARATOR);
  if (separatorIndex > 0) {
    // Check if the format matches a language code (2 characters) followed by the separator
    const possibleLangCode = name.substring(0, separatorIndex);
    if (possibleLangCode.match(/^[a-z]{2}$/)) {
      // This is a language prefix, strip it
      name = name.substring(separatorIndex + PAGE_NAME_SEPARATOR.length);
    }
  }
  
  // Continue with existing formatting
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

// Renamed from formatCosmologicalDate to formatDisplayDate
function formatCosmologicalDate(year: number): string {
  const absYear = Math.abs(year);
  
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

function formatLocalDate(date: TimelineJSDate): string {
  const { year, month, day } = date;
  const isNegativeYear = year < 0;
  const absYear = Math.abs(year);
  
  let result = `${absYear} ${isNegativeYear ? "BCE" : ""}`;
  
  if (month) {
    const dateObj = new Date(2000, month - 1, day || 1);
    result += ` ${dateObj.toLocaleString("default", { month: "short" })}`;
    if (day) {
      result += ` ${day}`;
    }
  }
  
  return result.trim();
}

// Helper function to compare dates (handles BCE/negative years properly)
function compareDates(a: TimelineJSDate, b: TimelineJSDate): number {
  // Compare years first (handle negative years correctly)
  if (a.year !== b.year) return a.year - b.year;
  
  // If years are equal, compare months
  const aMonth = a.month || 0;
  const bMonth = b.month || 0;
  if (aMonth !== bMonth) return aMonth - bMonth;
  
  // If months are equal, compare days
  const aDay = a.day || 0;
  const bDay = b.day || 0;
  return aDay - bDay;
}

// Helper function to check if a date requires cosmological scale
function requiresCosmologicalScale(date: TimelineJSDate): boolean {
  const absYear = Math.abs(date.year);
  const needsCosmological = date.year < 0 ? absYear > 271821 : absYear > 275760;
  
  if (needsCosmological) {
    logger.debug('Found date requiring cosmological scale:', { 
      year: date.year, 
      absYear, 
      isNegative: date.year < 0,
      threshold: date.year < 0 ? 271821 : 275760
    });
  }
  
  return needsCosmological;
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

/**
 * Formats timeline events for interactive display
 * @param timelines The source timeline data
 * @param colorSchemeId The color scheme to use
 * @param startIndex Optional starting index for filtering events (inclusive)
 * @param endIndex Optional ending index for filtering events (inclusive)
 * @param topEventsCount Optional number of top events to show based on importance score
 * @returns Formatted timeline with events, properly scaled and styled
 */
export function formatTimelineEventsForInteractive(
  timelines: Record<string, TimelineWithWikiSummary>, 
  colorSchemeId = 'default'
): TimelineJSTimeline {
  const groupIndices = new Map<string, number>();
  const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === colorSchemeId) || COLOR_SCHEMES[0];

  // Get the first color from the scheme
  const firstGroupColors = colorScheme.colors[0];

  // Merge and format all events from all timelines
  let formattedEvents = Object.entries(timelines).flatMap(([pageName, pageData], pageIndex) => {
    // Only add group if there are multiple pages
    const hasMultiplePages = Object.keys(timelines).length > 1;
    
    return pageData.timeline.events.map((event, eventIndex) => {
      const startDate = parseDate(event.startDate);
      
      return {
        original_event: event,
        start_date: startDate,
        ...(hasMultiplePages && { group: formatGroupName(pageName) }), // Conditionally add group
        ...(pageData.wikiSummary?.thumbnail && {  // Only add media if thumbnail exists
          media: {
            thumbnail: pageData.wikiSummary.thumbnail
          }
        })
      };
    });
  });

  // Sort all events chronologically by start date
  formattedEvents.sort((a, b) => compareDates(a.start_date, b.start_date));

  // Check if any dates in the FILTERED timeline events are outside human scale range
  const needsCosmologicalScale = formattedEvents.some(event => 
    requiresCosmologicalScale(event.start_date)
  );
  
  logger.debug('Timeline formatting', {
    totalEvents: formattedEvents.length,
    needsCosmologicalScale,
    oldestYear: formattedEvents.length > 0 ? Math.min(...formattedEvents.map(e => e.start_date.year)) : 'N/A',
    newestYear: formattedEvents.length > 0 ? Math.max(...formattedEvents.map(e => e.start_date.year)) : 'N/A',
    colorSchemeId
  });

  const isMultiplePages = Object.keys(timelines).length > 1;
  const pageNames = Object.keys(timelines).map(name => formatGroupName(name));

  return {
    title: {
      text: {
        headline: isMultiplePages
          ? `<span style="color: ${firstGroupColors.textColor}; font-weight: 600; text-shadow: none;">${pageNames.join(' | ')}</span>`
          : `<span style="color: ${firstGroupColors.textColor}; font-weight: 600; text-shadow: none;">${pageNames[0]}</span>`,
        text: isMultiplePages
          ? `<span style="color: ${firstGroupColors.textColor}; font-size: 0.9em; text-shadow: none;">${Object.values(timelines).map(t => t.timeline.title).join('<br/><br/>')}</span>`
          : `<span style="color: ${firstGroupColors.textColor}; font-size: 0.9em; text-shadow: none;">${Object.values(timelines)[0].timeline.title}</span>`
      },
      background: {
        color: firstGroupColors.color
      },
      unique_id: "0",
    },
    events: formattedEvents.map((formattedEvent, index) => {
      // Assign a consistent index to each group
      const event = formattedEvent.original_event;
      const groupKey = formattedEvent.group || "default";
      if (!groupIndices.has(groupKey)) {
        groupIndices.set(groupKey, groupIndices.size);
      }
      const groupIndex = groupIndices.get(groupKey)!;
      const colorIndex = groupIndex % Object.keys(colorScheme.colors).length;
      const colors = colorScheme.colors[colorIndex as keyof typeof colorScheme.colors];

      // Determine if this specific event needs cosmological formatting
      const eventNeedsCosmological = requiresCosmologicalScale(formattedEvent.start_date);

      // Format the display date appropriately
      let displayDate;
      if (needsCosmologicalScale && eventNeedsCosmological) {
        // Use cosmological format for events outside human range
        displayDate = formatCosmologicalDate(formattedEvent.start_date.year);
      } else {
        // Use local date format for human-scale dates
        displayDate = formatLocalDate(formattedEvent.start_date);
        
        // Add age if available - keep spaces around the pipe for display
        if (event.age !== undefined) {
          displayDate = `${displayDate.trim()} | Age ${event.age}`;
        }
      }

      return {
        start_date: formattedEvent.start_date,
        display_date: displayDate, // Always include display_date
        text: {
          headline: `<span style="color: ${colors.textColor}; font-weight: 600; text-shadow: none;">${event.headline}</span>`,
          text: `<span style="color: ${colors.textColor}; text-shadow: none;">${event.description}</span>`,
        },
        group: formattedEvent.group,
        ...(formattedEvent.media && { media: formattedEvent.media }),
        background: {
          color: colors.color,
        },
        // Changed to use just the index number without "event-" prefix
        unique_id: `${index + 1}`,
        score: event.score,
      };
    }),
    ...(needsCosmologicalScale && { scale: 'cosmological' as const }),
  };
}