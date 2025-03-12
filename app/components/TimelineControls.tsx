import { useState, useRef, useEffect } from "react";
import { TimelineJSEvent } from "@/app/types/timeline";
import TimelineFilter from "@/app/components/TimelineFilter";
import TimelinePageEdit from "@/app/components/TimelinePageEdit";

interface SelectedPage {
  title: string;
  link: string;
  language: string; // Language code (e.g., "en", "fr", "de")
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
  onTopEventsCountChange?: (count: number | null) => void; // Callback for top events filter
  currentTopEventsCount?: number | null; // Current top events count
  speedDialOpen: boolean; // Whether the speed dial is open
  setSpeedDialOpen: (open: boolean) => void; // Set speed dial open state
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
  onTopEventsCountChange,
  currentTopEventsCount = null,
  speedDialOpen,
  setSpeedDialOpen,
}: TimelineControlsProps) {
  const speedDialRef = useRef<HTMLDivElement>(null);

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
  }, [speedDialOpen, setSpeedDialOpen]);

  const openModal = (type: "pages" | "filter") => {
    setActiveModal?.(type);
    setSpeedDialOpen(false);
    onExpandedChange(true);
  };

  const closeModal = () => {
    setActiveModal?.(null);
    onExpandedChange(false);
  };

  return (
    <>
      {/* Speed Dial Floating Action Button */}
      <div
        ref={speedDialRef}
        className="absolute right-4 bottom-4 z-40 flex flex-col items-end"
      >
        {/* Speed Dial Options */}
        <div className="flex flex-col items-center">
          {speedDialOpen && (
            <div className="bg-indigo-500 dark:bg-indigo-600 rounded-t-[24px] shadow-lg w-12 animate-expand-in origin-bottom flex flex-col items-center gap-3 pt-3 pb-6">
              {/* Filter Option */}
              <button
                onClick={() => openModal("filter")}
                className="flex items-center justify-center bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full p-3 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group w-10 h-10"
                data-tour="filter-button"
              >
                <span className="absolute right-[4.5rem] bg-gray-800 dark:bg-gray-700 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Filter Events
                </span>
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
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </button>

              {/* Edit Pages Option */}
              <button
                onClick={() => openModal("pages")}
                className="flex items-center justify-center bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full p-3 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group w-10 h-10"
                data-tour="edit-pages-button"
              >
                <span className="absolute right-[4.5rem] bg-gray-800 dark:bg-gray-700 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Edit Pages
                </span>
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Main Speed Dial Button */}
          <button
            onClick={() => setSpeedDialOpen(!speedDialOpen)}
            className={`flex items-center justify-center rounded-full shadow-lg transition-all w-12 h-12 speed-dial-button ${
              speedDialOpen
                ? "bg-blue-500 text-white rotate-45 -mt-6"
                : "bg-blue-500 hover:bg-blue-600 text-white"
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
                <TimelinePageEdit
                  selectedPages={selectedPages}
                  onPagesChange={onPagesChange}
                  onRefresh={onRefresh}
                  onClose={closeModal}
                />
              )}

              {/* Filters Section */}
              {activeModal === "filter" && events.length > 0 && (
                <TimelineFilter
                  events={events}
                  onDateRangeChange={onDateRangeChange || (() => {})}
                  currentDateRange={currentDateRange}
                  onTopEventsCountChange={onTopEventsCountChange || (() => {})}
                  currentTopEventsCount={currentTopEventsCount}
                  onClose={closeModal}
                />
              )}

              {/* Empty State */}
              {activeModal === "filter" && events.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <svg
                    className="w-12 h-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Events Available
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    There are no events to filter. Add some Wikipedia pages to
                    generate a timeline.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
