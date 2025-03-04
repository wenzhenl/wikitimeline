import WikiSearch from "@/app/components/WikiSearch";
import { useState, useEffect } from "react";
import LanguageSettings from "@/app/components/LanguageSettings";
import logger from "@/app/utils/logger";

interface SelectedPage {
  title: string;
  link: string;
  language: string; // Language code (e.g., "en", "fr", "de")
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add logging to track page changes
  useEffect(() => {
    // Log the languages of existing pages
    const languageCounts = selectedPages.reduce((acc, page) => {
      acc[page.language] = (acc[page.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.debug(
      `TimelinePageEdit: Current pages by language: ${JSON.stringify(
        languageCounts
      )}`
    );
  }, [selectedPages]);

  const handlePageChange = (newPages: SelectedPage[]) => {
    if (newPages.length === 0) return;

    // Log the previous and new page count
    const addedCount = newPages.length - selectedPages.length;
    if (addedCount > 0) {
      // Pages were added, log the new pages
      const addedPages = newPages.slice(selectedPages.length);
      logger.debug(
        `TimelinePageEdit: Added ${addedCount} pages: ${JSON.stringify(
          addedPages.map((p) => ({ title: p.title, language: p.language }))
        )}`
      );
    }

    onPagesChange(newPages);
  };

  const handleUpdateTimeline = () => {
    onRefresh();
    onClose();
  };

  const openLanguageSettings = () => setIsSettingsOpen(true);

  return (
    <div className="space-y-6">
      <WikiSearch
        selectedPages={selectedPages}
        onPagesChange={handlePageChange}
        onSubmit={() => {}}
        placeholder="Add Wikipedia pages..."
        className="mb-4"
        onSettingsClick={openLanguageSettings}
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

      {/* Language Settings Modal */}
      <LanguageSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
