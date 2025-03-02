"use client";

import { AVAILABLE_FONTS } from "@/app/constants/fonts";
import { COLOR_SCHEMES } from "@/app/constants/colorSchemes";

type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];
type FontId = (typeof AVAILABLE_FONTS)[number]["value"];
type TimenavPosition = "top" | "bottom";

interface TimelineCustomizerProps {
  selectedFont: FontId;
  setSelectedFont: (font: FontId) => void;
  selectedColorScheme: ColorSchemeId;
  setSelectedColorScheme: (colorScheme: ColorSchemeId) => void;
  selectedTimenavPosition: TimenavPosition;
  setSelectedTimenavPosition: (position: TimenavPosition) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  isMobileButton?: boolean;
  onMobileClick?: () => void;
}

export default function TimelineCustomizer({
  selectedFont,
  setSelectedFont,
  selectedColorScheme,
  setSelectedColorScheme,
  selectedTimenavPosition,
  setSelectedTimenavPosition,
  isSettingsOpen,
  setIsSettingsOpen,
  isMobileButton = false,
  onMobileClick,
}: TimelineCustomizerProps) {
  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = e.target.value;
    setSelectedFont(newFont as FontId);
    localStorage.setItem("timeline-font", newFont);
  };

  const handleColorSchemeChange = (value: string) => {
    setSelectedColorScheme(value);
    localStorage.setItem("timeline-color-scheme", value);
  };

  const handleTimenavPositionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newPosition = e.target.value as TimenavPosition;
    setSelectedTimenavPosition(newPosition);
    localStorage.setItem("timeline-timenav-position", newPosition);
  };

  // For mobile menu button, we just want a button without the modal
  if (isMobileButton) {
    return (
      <button
        onClick={onMobileClick}
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        Customize Timeline
      </button>
    );
  }

  return (
    <>
      {/* Button to open the customizer */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg whitespace-nowrap"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        Customize Timeline
      </button>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 top-16 z-[60] overflow-y-auto"
          aria-labelledby="settings-modal"
          role="dialog"
        >
          <div className="min-h-[calc(100vh-4rem)] px-4 text-center">
            <div
              className="fixed inset-0 top-16 bg-black/30 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsSettingsOpen(false)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Customize Timeline
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
              <div className="mb-4">
                <label
                  htmlFor="font-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Timeline Font
                </label>
                <select
                  id="font-select"
                  value={selectedFont}
                  onChange={handleFontChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="timenav-position-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Timeline Navigation Position
                </label>
                <select
                  id="timenav-position-select"
                  value={selectedTimenavPosition}
                  onChange={handleTimenavPositionChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="color-scheme-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Color Scheme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => handleColorSchemeChange(scheme.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedColorScheme === scheme.id
                          ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex gap-1 h-6 mb-2">
                        {Object.values(scheme.colors)
                          .slice(0, 5)
                          .map((color, i) => (
                            <div
                              key={i}
                              className="w-full rounded"
                              style={{
                                backgroundColor: color.color,
                                borderColor: color.textColor,
                                borderWidth: 1,
                              }}
                            />
                          ))}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {scheme.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
