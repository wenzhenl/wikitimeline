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

  const handleTimenavPositionChange = (position: TimenavPosition) => {
    setSelectedTimenavPosition(position);
    localStorage.setItem("timeline-timenav-position", position);
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
              <div className="flex justify-between items-center mb-5">
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

              {/* Font Selection */}
              <section className="mb-6">
                <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Font Style
                </h4>
                <label
                  htmlFor="font-select"
                  className="block text-sm text-gray-700 dark:text-gray-300 mb-2"
                >
                  Choose a font for your timeline content
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
              </section>

              <div className="border-t border-gray-200 dark:border-gray-700 mb-6"></div>

              {/* Timeline Navigation Position */}
              <section className="mb-6">
                <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Timeline Navigation Bar
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose where the timeline slider navigation bar should appear
                  (the horizontal bar with date markers that lets you navigate
                  through the timeline)
                </p>

                <div className="flex flex-col gap-4 mt-2">
                  {/* Top Position Option */}
                  <div
                    className={`relative flex items-start p-3 rounded-lg border ${
                      selectedTimenavPosition === "top"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    } cursor-pointer`}
                    onClick={() => handleTimenavPositionChange("top")}
                  >
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="flex items-center">
                        <input
                          id="timenav-top"
                          name="timenav-position"
                          type="radio"
                          checked={selectedTimenavPosition === "top"}
                          onChange={() => handleTimenavPositionChange("top")}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <label
                          htmlFor="timenav-top"
                          className="ml-3 font-medium text-gray-700 dark:text-gray-300"
                        >
                          Top
                        </label>
                      </div>
                      <div className="mt-2 ml-7">
                        <div className="h-12 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                          {/* Visual representation of timeline with nav at top */}
                          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex items-center justify-center">
                            <div className="h-1 w-3/4 bg-blue-500 rounded"></div>
                          </div>
                          <div className="h-9 bg-white dark:bg-gray-800 flex items-center justify-center">
                            <span className="text-xs text-gray-400">
                              Content
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Position Option */}
                  <div
                    className={`relative flex items-start p-3 rounded-lg border ${
                      selectedTimenavPosition === "bottom"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    } cursor-pointer`}
                    onClick={() => handleTimenavPositionChange("bottom")}
                  >
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="flex items-center">
                        <input
                          id="timenav-bottom"
                          name="timenav-position"
                          type="radio"
                          checked={selectedTimenavPosition === "bottom"}
                          onChange={() => handleTimenavPositionChange("bottom")}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <label
                          htmlFor="timenav-bottom"
                          className="ml-3 font-medium text-gray-700 dark:text-gray-300"
                        >
                          Bottom
                        </label>
                      </div>
                      <div className="mt-2 ml-7">
                        <div className="h-12 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                          {/* Visual representation of timeline with nav at bottom */}
                          <div className="h-9 bg-white dark:bg-gray-800 flex items-center justify-center">
                            <span className="text-xs text-gray-400">
                              Content
                            </span>
                          </div>
                          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 flex items-center justify-center">
                            <div className="h-1 w-3/4 bg-blue-500 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-200 dark:border-gray-700 mb-6"></div>

              {/* Color Scheme */}
              <section>
                <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Color Scheme
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose a color palette for your timeline
                </p>
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
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
