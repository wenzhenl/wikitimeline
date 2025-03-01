import WikiSearch from "@/app/components/WikiSearch";
import { useState, useRef, useEffect } from "react";
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
  activeModal?: "pages" | "filter" | null; // The currently active modal
  setActiveModal?: (modal: "pages" | "filter" | null) => void; // Set the active modal
  currentDateRange?: {
    startEventId: string | null;
    endEventId: string | null;
  }; // Current date range filter values
}

export default function TimelineControls({
  selectedPages,
  onPagesChange,
  onRefresh,
  isExpanded,
  onExpandedChange,
  events = [],
  onDateRangeChange,
  activeModal,
  setActiveModal,
  currentDateRange = { startEventId: null, endEventId: null },
}: TimelineControlsProps) {
  // Temporary filter state - only applied when user clicks "Apply Filters"
  const [tempStartEventId, setTempStartEventId] = useState<string | null>(
    currentDateRange.startEventId
  );
  const [tempEndEventId, setTempEndEventId] = useState<string | null>(
    currentDateRange.endEventId
  );
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const speedDialRef = useRef<HTMLDivElement>(null);

  // Update temp filter values when the modal opens with filter tool
  useEffect(() => {
    if (activeModal === "filter" && isExpanded) {
      setTempStartEventId(currentDateRange.startEventId);
      setTempEndEventId(currentDateRange.endEventId);
    }
  }, [activeModal, isExpanded, currentDateRange]);

  // Close speed dial when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        speedDialRef.current &&
        !speedDialRef.current.contains(event.target as Node)
      ) {
        setSpeedDialOpen(false);
      }
    };

    if (speedDialOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [speedDialOpen]);

  const handlePageChange = (newPages: SelectedPage[]) => {
    if (newPages.length === 0) return;
    onPagesChange(newPages);
  };

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

  // Apply filters when the Apply Filters button is clicked
  const applyFilters = () => {
    if (onDateRangeChange) {
      onDateRangeChange(tempStartEventId, tempEndEventId);
    }
    closeModal();
  };

  const openModal = (type: "pages" | "filter") => {
    setActiveModal?.(type);
    setSpeedDialOpen(false);
    onExpandedChange(true);
  };

  const closeModal = () => {
    setActiveModal?.(null);
    onExpandedChange(false);
  };

  // Format date from TimelineJSEvent - now using display_date directly
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
      {/* Speed Dial Floating Action Button */}
      <div
        ref={speedDialRef}
        className="absolute right-4 bottom-4 z-40 flex flex-col-reverse items-end"
      >
        {/* Speed Dial Options */}
        {speedDialOpen && (
          <div className="mb-2 flex flex-col gap-2 items-end">
            {/* Edit Pages Option */}
            <button
              onClick={() => openModal("pages")}
              className="flex items-center bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full p-3 shadow-lg transition-transform hover:scale-105 group"
            >
              <span className="absolute right-12 bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Edit Pages
              </span>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>

            {/* Filter Option */}
            <button
              onClick={() => openModal("filter")}
              className="flex items-center bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full p-3 shadow-lg transition-transform hover:scale-105 group"
            >
              <span className="absolute right-12 bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Filter Events
              </span>
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
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Main Speed Dial Button */}
        <button
          onClick={() => setSpeedDialOpen(!speedDialOpen)}
          className={`bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all ${
            speedDialOpen ? "rotate-45" : ""
          }`}
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
      </div>

      {/* Modal Overlay */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 top-16 sm:top-0">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col"
            style={{ height: "calc(100vh - 200px)" }}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {activeModal === "pages"
                  ? "Edit Timeline Pages"
                  : "Filter Timeline Events"}
              </h3>
              <button
                onClick={closeModal}
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
              {activeModal === "pages" && (
                <WikiSearch
                  selectedPages={selectedPages}
                  onPagesChange={handlePageChange}
                  onSubmit={() => {}}
                  placeholder="Add Wikipedia pages..."
                  className="mb-4"
                />
              )}

              {/* Date Range Filter */}
              {activeModal === "filter" && events.length > 0 && (
                <div className="mb-6">
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
                          <option
                            key={`end-${event.unique_id}`}
                            value={event.unique_id}
                          >
                            {`[${formatEventDate(
                              event
                            )}] ${event.text.headline.replace(
                              /<[^>]*>?/gm,
                              ""
                            )}`}
                          </option>
                        ))}
                    </select>
                  </div>

                  {(tempStartEventId || tempEndEventId) && (
                    <button
                      onClick={() => {
                        setTempStartEventId(null);
                        setTempEndEventId(null);
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
              {activeModal === "pages" ? (
                <button
                  onClick={() => {
                    onRefresh();
                    closeModal();
                  }}
                  className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Update Timeline
                </button>
              ) : (
                <button
                  onClick={applyFilters}
                  className="px-8 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Apply Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
