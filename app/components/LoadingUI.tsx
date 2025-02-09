export default function LoadingUI() {
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-4"
          style={{ animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
          Generating Timeline...
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2 text-center max-w-md px-4">
          Our AI is reading through Wikipedia articles and extracting
          chronological events. This usually takes 10-15 seconds.
        </p>
      </div>
    </div>
  );
}
