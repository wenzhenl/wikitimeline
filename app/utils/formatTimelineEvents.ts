import { TimelineEvent } from "../timeline/[pageName]/page";

// Define background colors for different groups with better contrast
export const GROUP_COLORS = {
    0: {
      color: "#F8FAFC",
      textColor: "#1E293B", // slate-800
    },
    1: {
      color: "#F0F9FF",
      textColor: "#0369A1", // sky-600
    },
    2: {
      color: "#F5F3FF",
      textColor: "#6D28D9", // violet-800
    },
    3: {
      color: "#FFFBEB",
      textColor: "#B45309", // amber-800
    },
    4: {
      color: "#FFF1F2",
      textColor: "#E11D48", // rose-600
    },
    5: {
      color: "#EEF2FF",
      textColor: "#4338CA", // indigo-800
    },
    6: {
      color: "#F0FDFA",
      textColor: "#115E59", // teal-800
    },
    7: {
      color: "#FDF2F8",
      textColor: "#BE185D", // pink-800
    },
    8: {
      color: "#FAF5FF",
      textColor: "#7E22CE", // purple-800
    },
    9: {
      color: "#ECFDF5",
      textColor: "#065F46", // green-800
    },
  };
  

export function formatTimelineEvents(events: TimelineEvent[]) {
  const groupIndices = new Map<string, number>();

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
    const colors = GROUP_COLORS[groupIndex as keyof typeof GROUP_COLORS] || GROUP_COLORS[0];

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