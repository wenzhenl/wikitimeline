import WikiSearch from "@/app/components/WikiSearch";

interface SelectedPage {
  title: string;
  link: string;
}

interface TimelinePageEditProps {
  selectedPages: SelectedPage[];
  onPagesChange: (pages: SelectedPage[]) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export default function TimelinePageEdit({
  selectedPages,
  onPagesChange,
  onRefresh,
  onClose,
}: TimelinePageEditProps) {
  const handlePageChange = (newPages: SelectedPage[]) => {
    if (newPages.length === 0) return;
    onPagesChange(newPages);
  };

  const handleUpdateTimeline = () => {
    onRefresh();
    onClose();
  };

  return (
    <div className="space-y-6">
      <WikiSearch
        selectedPages={selectedPages}
        onPagesChange={handlePageChange}
        onSubmit={() => {}}
        placeholder="Add Wikipedia pages..."
        className="mb-4"
      />

      {/* Action buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleUpdateTimeline}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Update Timeline
        </button>
      </div>
    </div>
  );
}
