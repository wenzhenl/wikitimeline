import WikiSearch from "@/app/components/WikiSearch";
import { useState, useEffect } from "react";
import LanguageSettings from "@/app/components/LanguageSettings";
import logger from "@/app/utils/logger";
import {
  trackEvent,
  ANALYTICS_CATEGORIES,
  ANALYTICS_ACTIONS,
} from "@/app/utils/analytics";

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
  const [fixedPages, setFixedPages] = useState<SelectedPage[]>([]);

  // Pre-process and decode any encoded page titles
  useEffect(() => {
    // Process potentially encoded titles in selectedPages
    const processedPages = selectedPages.map((page) => {
      // Check if the title appears to be URL encoded
      if (/%[0-9A-F]{2}/i.test(page.title)) {
        try {
          const decodedTitle = decodeURIComponent(page.title);
          logger.debug(
            `Decoded title from "${page.title}" to "${decodedTitle}"`,
          );
          return { ...page, title: decodedTitle };
        } catch (e) {
          logger.warn(`Failed to decode title: ${page.title}`);
          return page;
        }
      }
      return page;
    });

    setFixedPages(processedPages);
  }, [selectedPages]);

  // Debug logging for selected pages
  useEffect(() => {
    // Log the full details of the selected pages for debugging
    logger.debug(
      "TimelinePageEdit selected pages:",
      JSON.stringify(selectedPages, null, 2),
    );
  }, [selectedPages]);

  // Add logging to track page changes
  useEffect(() => {
    // Log the languages of existing pages
    const languageCounts = selectedPages.reduce(
      (acc, page) => {
        acc[page.language] = (acc[page.language] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    logger.debug(
      `TimelinePageEdit: Current pages by language: ${JSON.stringify(
        languageCounts,
      )}`,
    );
  }, [selectedPages]);

  const handlePageChange = (newPages: SelectedPage[]) => {
    if (newPages.length === 0) return;

    // Process potentially encoded titles in newPages
    const processedPages = newPages.map((page) => {
      // Check if the title appears to be URL encoded
      if (/%[0-9A-F]{2}/i.test(page.title)) {
        try {
          const decodedTitle = decodeURIComponent(page.title);
          logger.debug(
            `Decoded title from "${page.title}" to "${decodedTitle}"`,
          );
          return { ...page, title: decodedTitle };
        } catch (e) {
          logger.warn(`Failed to decode title: ${page.title}`);
          return page;
        }
      }
      return page;
    });

    // Track page changes
    const addedCount = processedPages.length - selectedPages.length;
    if (addedCount > 0) {
      trackEvent(
        ANALYTICS_CATEGORIES.TIMELINE,
        ANALYTICS_ACTIONS.EDIT_PAGES,
        `added_${addedCount}_pages`,
      );
    }

    onPagesChange(processedPages);
  };

  const handleUpdateTimeline = () => {
    // Track timeline update with page count
    trackEvent(
      ANALYTICS_CATEGORIES.TIMELINE,
      ANALYTICS_ACTIONS.UPDATE_PAGES,
      `total_pages_${fixedPages.length}`,
    );

    onRefresh();
    onClose();
  };

  const openLanguageSettings = () => setIsSettingsOpen(true);

  return (
    <div className="space-y-6">
      <WikiSearch
        selectedPages={fixedPages}
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
