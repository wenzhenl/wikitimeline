export default function LoadingUI() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm" />
      <div
        className="relative w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-4"
        style={{
          animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          borderColor: "rgb(59 130 246 / 1)", // blue-500
          borderTopColor: "transparent",
        }}
      />
      <h2 className="relative text-xl font-medium text-gray-900 dark:text-gray-100">
        Generating Timeline...
      </h2>
      <p className="relative text-gray-600 dark:text-gray-300 mt-2 text-center max-w-md px-4">
        Our AI is reading through Wikipedia articles and extracting
        chronological events. This usually takes 10-15 seconds.
      </p>
    </div>
  );
}
