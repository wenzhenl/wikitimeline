export default function LoadingUI() {
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"
          style={{ animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </div>
    </div>
  );
}
