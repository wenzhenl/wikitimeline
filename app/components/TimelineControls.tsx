import WikiSearch from "@/app/components/WikiSearch";
import { useState } from "react";
import { TimelineJSEvent } from "@/app/types/timeline";

interface SelectedPage {
  title: string;
  link: string;
}

interface TimelineControlsProps {
  selectedPages: SelectedPage[];
  onPagesChange: (pages: SelectedPage[]) => void;
  onRefresh: () => void;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  events?: TimelineJSEvent[]; // Timeline events for filtering
  onDateRangeChange?: (
    startEventId: string | null,
    endEventId: string | null
  ) => void; // Callback for date range changes
}

export default function TimelineControls({
  selectedPages,
  onPagesChange,
  onRefresh,
  isExpanded,
  onExpandedChange,
  events = [],
  onDateRangeChange,
}: TimelineControlsProps) {
  const [startEventId, setStartEventId] = useState<string | null>(null);
  const [endEventId, setEndEventId] = useState<string | null>(null);

  const handlePageChange = (newPages: SelectedPage[]) => {
    if (newPages.length === 0) return;
    onPagesChange(newPages);
  };

  const handleStartEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStartId = e.target.value || null;
    setStartEventId(newStartId);

    // If end date is before start date, reset end date
    if (newStartId && endEventId) {
      const startIdx = events.findIndex(
        (event) => event.unique_id === newStartId
      );
      const endIdx = events.findIndex(
        (event) => event.unique_id === endEventId
      );
      if (startIdx > endIdx) {
        setEndEventId(null);
      }
    }

    if (onDateRangeChange) {
      onDateRangeChange(newStartId, endEventId);
    }
  };

  const handleEndEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEndId = e.target.value || null;
    setEndEventId(newEndId);

    if (onDateRangeChange) {
      onDateRangeChange(startEventId, newEndId);
    }
  };

  // Format date from TimelineJSEvent - now using display_date directly
  const formatEventDate = (event: TimelineJSEvent): string => {
    // Use display_date if available (strips HTML tags)
    if (event.display_date) {
      return event.display_date.replace(/<[^>]*>?/gm, "");
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

    return dateStr;
  };

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => {
    const aYear = a.start_date?.year || 0;
    const bYear = b.start_date?.year || 0;

    if (aYear !== bYear) return aYear - bYear;

    const aMonth = a.start_date?.month || 0;
    const bMonth = b.start_date?.month || 0;
    if (aMonth !== bMonth) return aMonth - bMonth;

    const aDay = a.start_date?.day || 0;
    const bDay = b.start_date?.day || 0;
    return aDay - bDay;
  });

  return (
    <>
      {/* Floating Button - Position relative to timeline container */}
      <button
        onClick={() => onExpandedChange(true)}
        className="absolute right-4 bottom-4 z-40 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-transform hover:scale-105"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>

      {/* Modal Overlay - Updated with consistent top spacing */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 top-16 sm:top-0">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col"
            style={{ height: "calc(100vh - 200px)" }}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit Timeline</h3>
              <button
                onClick={() => onExpandedChange(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <WikiSearch
                selectedPages={selectedPages}
                onPagesChange={handlePageChange}
                onSubmit={() => {}}
                placeholder="Add more Wikipedia pages..."
                className="mb-4"
              />

              {/* Date Range Filter */}
              {events.length > 0 && (
                <div className="mb-6 mt-6 border-t pt-4 border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-semibold mb-3">
                    Filter Events by Date Range
                  </h4>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Event
                    </label>
                    <select
                      value={startEventId || ""}
                      onChange={handleStartEventChange}
                      className="block w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md shadow-sm text-sm"
                    >
                      <option value="">-- All Events --</option>
                      {sortedEvents.map((event) => (
                        <option
                          key={`start-${event.unique_id}`}
                          value={event.unique_id}
                        >
                          {`[${formatEventDate(
                            event
                          )}] ${event.text.headline.replace(/<[^>]*>?/gm, "")}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Event
                    </label>
                    <select
                      value={endEventId || ""}
                      onChange={handleEndEventChange}
                      className="block w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md shadow-sm text-sm"
                    >
                      <option value="">-- All Events --</option>
                      {sortedEvents.map((event) => (
                        <option
                          key={`end-${event.unique_id}`}
                          value={event.unique_id}
                          disabled={
                            startEventId
                              ? sortedEvents.findIndex(
                                  (e) => e.unique_id === event.unique_id
                                ) <
                                sortedEvents.findIndex(
                                  (e) => e.unique_id === startEventId
                                )
                              : false
                          }
                        >
                          {`[${formatEventDate(
                            event
                          )}] ${event.text.headline.replace(/<[^>]*>?/gm, "")}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(startEventId || endEventId) && (
                    <button
                      onClick={() => {
                        setStartEventId(null);
                        setEndEventId(null);
                        if (onDateRangeChange) {
                          onDateRangeChange(null, null);
                        }
                      }}
                      className="mt-2 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
              <button
                onClick={() => {
                  onRefresh();
                  onExpandedChange(false);
                }}
                className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Update Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
