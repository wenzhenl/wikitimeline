import WikiSearch from "./WikiSearch";

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
}

export default function TimelineControls({
  selectedPages,
  onPagesChange,
  onRefresh,
  isExpanded,
  onExpandedChange,
}: TimelineControlsProps) {
  const handlePageChange = (newPages: SelectedPage[]) => {
    if (newPages.length === 0) return;
    onPagesChange(newPages);
  };

  return (
    <>
      {/* Floating Button - Adjusted positioning */}
      <button
        onClick={() => onExpandedChange(true)}
        className="fixed right-4 bottom-4 z-40 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-transform hover:scale-105"
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

      {/* Modal Overlay */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
