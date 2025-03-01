import { useState, useEffect } from "react";
import { TimelineJSEvent } from "@/app/types/timeline";

interface TimelineFilterProps {
  events: TimelineJSEvent[];
  onDateRangeChange: (
    startEventId: string | null,
    endEventId: string | null
  ) => void;
  currentDateRange: {
    startEventId: string | null;
    endEventId: string | null;
  };
  onTopEventsCountChange: (count: number | null) => void;
  currentTopEventsCount: number | null;
  onClose: () => void;
}

export default function TimelineFilter({
  events,
  onDateRangeChange,
  currentDateRange,
  onTopEventsCountChange,
  currentTopEventsCount,
  onClose,
}: TimelineFilterProps) {
  // Temporary filter state - only applied when user clicks "Apply Filters"
  const [tempStartEventId, setTempStartEventId] = useState<string | null>(
    currentDateRange.startEventId
  );
  const [tempEndEventId, setTempEndEventId] = useState<string | null>(
    currentDateRange.endEventId
  );
  const [tempTopEventsCount, setTempTopEventsCount] = useState<number | null>(
    currentTopEventsCount
  );

  // Calculate filtered events count based on current date range filter
  const [filteredEventsCount, setFilteredEventsCount] = useState<number>(
    events.length
  );

  // Sort events chronologically for consistent display in dropdowns
  const sortedEvents = [...events].sort((a, b) => {
    const aYear = a.start_date?.year || 0;
    const bYear = b.start_date?.year || 0;
    return aYear - bYear;
  });

  // Initialize all values when component mounts or when events change
  useEffect(() => {
    // Update filtered count initial value
    setFilteredEventsCount(events.length);
  }, [events]);

  // Update filter counts and adjust slider max when date range changes
  useEffect(() => {
    if (!events.length) return;

    let startIndex = 0;
    let endIndex = events.length - 1;

    // Get start index from date range filter
    if (tempStartEventId) {
      const foundStartIndex = events.findIndex(
        (event) => event.unique_id === tempStartEventId
      );
      if (foundStartIndex !== -1) {
        startIndex = foundStartIndex;
      }
    }

    // Get end index from date range filter
    if (tempEndEventId) {
      const foundEndIndex = events.findIndex(
        (event) => event.unique_id === tempEndEventId
      );
      if (foundEndIndex !== -1) {
        endIndex = foundEndIndex;
      }
    }

    // Calculate events in current date range
    const count = endIndex - startIndex + 1;
    setFilteredEventsCount(count);

    // If top events count is greater than filtered count, adjust it down
    if (tempTopEventsCount && tempTopEventsCount > count) {
      setTempTopEventsCount(count);
    }
  }, [events, tempStartEventId, tempEndEventId, tempTopEventsCount]);

  // Update temporary start event ID, but don't apply filter yet
  const handleTempStartEventChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStartId = e.target.value || null;
    setTempStartEventId(newStartId);

    // If end date is before start date, reset end date
    if (newStartId && tempEndEventId) {
      const startIdx = events.findIndex(
        (event) => event.unique_id === newStartId
      );
      const endIdx = events.findIndex(
        (event) => event.unique_id === tempEndEventId
      );
      if (startIdx > endIdx) {
        setTempEndEventId(null);
      }
    }
  };

  // Update temporary end event ID, but don't apply filter yet
  const handleTempEndEventChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newEndId = e.target.value || null;
    setTempEndEventId(newEndId);
  };

  // Update the slider or input with slider value
  const handleTopEventsSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // When the value is the max value (all events), set to null (no filter)
    const newCount =
      value === "" || parseInt(value, 10) === filteredEventsCount
        ? null
        : parseInt(value, 10);
    setTempTopEventsCount(newCount);
  };

  // Get the visual slider value - this ensures the slider is at max when tempTopEventsCount is null
  const getSliderValue = () => {
    if (tempTopEventsCount === null) {
      return filteredEventsCount; // Max position (right end) when no filter is applied
    }
    return tempTopEventsCount;
  };

  // Apply filters when the Apply Filters button is clicked
  const applyFilters = () => {
    onDateRangeChange(tempStartEventId, tempEndEventId);
    onTopEventsCountChange(tempTopEventsCount);
    onClose();
  };

  // Reset all filters to default values
  const resetAllFilters = () => {
    setTempStartEventId(null);
    setTempEndEventId(null);
    setTempTopEventsCount(null);
  };

  // Check if any filters are applied (for reset button visibility)
  const hasFiltersApplied =
    tempStartEventId !== null ||
    tempEndEventId !== null ||
    tempTopEventsCount !== null;

  // Format date from TimelineJSEvent
  const formatEventDate = (event: TimelineJSEvent): string => {
    // Use display_date if available (strips HTML tags)
    if (event.display_date) {
      // Strip HTML tags and ensure no trailing spaces
      // Also normalize the pipe symbol by removing spaces around it
      return event.display_date
        .replace(/<[^>]*>?/gm, "")
        .trim()
        .replace(/ \| /g, "|");
    }

    // Fallback to start_date properties if display_date is not available
    if (!event.start_date) return "No date";

    const { year, month, day } = event.start_date;

    // Format date using only the start_date properties
    const isNegativeYear = year < 0;
    const absYear = Math.abs(year);

    let dateStr = isNegativeYear ? `${absYear} BCE` : `${absYear}`;

    if (month) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      if (day) {
        dateStr = `${day} ${monthNames[month - 1]} ${dateStr}`;
      } else {
        dateStr = `${monthNames[month - 1]} ${dateStr}`;
      }
    }

    return dateStr.trim();
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div>
        <h4 className="text-md font-semibold mb-3">
          Filter Events by Date Range
        </h4>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Event
          </label>
          <select
            value={tempStartEventId || ""}
            onChange={handleTempStartEventChange}
            className="block w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md shadow-sm text-sm"
          >
            <option value="">-- All Events --</option>
            {sortedEvents.map((event) => (
              <option key={`start-${event.unique_id}`} value={event.unique_id}>
                {`[${formatEventDate(event)}] ${event.text.headline.replace(
                  /<[^>]*>?/gm,
                  ""
                )}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Event
          </label>
          <select
            value={tempEndEventId || ""}
            onChange={handleTempEndEventChange}
            className="block w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md shadow-sm text-sm"
          >
            <option value="">-- All Events --</option>
            {sortedEvents
              // Filter out options that come before the selected start date
              .filter(
                (event) =>
                  !tempStartEventId ||
                  sortedEvents.findIndex(
                    (e) => e.unique_id === event.unique_id
                  ) >=
                    sortedEvents.findIndex(
                      (e) => e.unique_id === tempStartEventId
                    )
              )
              .map((event) => (
                <option key={`end-${event.unique_id}`} value={event.unique_id}>
                  {`[${formatEventDate(event)}] ${event.text.headline.replace(
                    /<[^>]*>?/gm,
                    ""
                  )}`}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Importance Score Filter - with slider */}
      <div>
        <h4 className="text-md font-semibold mb-3">Filter by Importance</h4>

        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Show Top Events
            </label>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {tempTopEventsCount
                ? `Top ${tempTopEventsCount} of ${filteredEventsCount}`
                : `All ${filteredEventsCount} events`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={filteredEventsCount}
              value={getSliderValue()}
              onChange={handleTopEventsSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
            />
            <button
              onClick={() => setTempTopEventsCount(null)}
              className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              disabled={tempTopEventsCount === null}
              title="Show all events"
            >
              Reset
            </button>
          </div>

          {/* Custom slider styles */}
          <style jsx>{`
            .slider-thumb::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              background: #3b82f6;
              border-radius: 50%;
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .slider-thumb::-moz-range-thumb {
              width: 20px;
              height: 20px;
              background: #3b82f6;
              border-radius: 50%;
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .slider-thumb:active::-webkit-slider-thumb {
              width: 24px;
              height: 24px;
              background: #2563eb;
            }

            .slider-thumb:active::-moz-range-thumb {
              width: 24px;
              height: 24px;
              background: #2563eb;
            }
          `}</style>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={resetAllFilters}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          disabled={!hasFiltersApplied}
        >
          Reset All
        </button>
        <div className="space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
