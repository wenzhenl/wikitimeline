"use client";

import { PAGE_DELIMITER } from "@/app/constants";
import { formatPageName } from "@/app/utils/helper";

interface SkippedPageInfo {
  pageName: string;
  reason: string;
}

interface SkippedPagesModalProps {
  skippedPages: string[] | SkippedPageInfo[];
  showModal: boolean;
  onClose: () => void;
}

export default function SkippedPagesModal({
  skippedPages,
  showModal,
  onClose,
}: SkippedPagesModalProps) {
  if (!showModal || skippedPages.length === 0) {
    return null;
  }

  // Check if we have detailed info or just page names
  const hasDetailedInfo = typeof skippedPages[0] !== "string";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-20 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        ></div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen sm:mt-16"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:mt-16">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-yellow-600 dark:text-yellow-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3
                  className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                  id="modal-title"
                >
                  Some pages were skipped
                </h3>
                <div className="mt-2">
                  {hasDetailedInfo ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p className="mb-2">
                        The following pages could not be processed:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        {(skippedPages as SkippedPageInfo[]).map(
                          (page, index) => (
                            <li key={index}>
                              <span className="font-medium">
                                {formatPageName(page.pageName).formattedName}
                              </span>
                              : {page.reason}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No timeline data could be extracted from:{" "}
                      {(skippedPages as string[])
                        .map(
                          (page) =>
                            formatPageName(decodeURIComponent(page))
                              .formattedName
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
