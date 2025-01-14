export default function LoadingUI() {
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/90 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-medium text-gray-100">
          Generating Timeline...
        </h2>
        <p className="text-gray-300 mt-2 text-center max-w-md">
          Please wait while we analyze and process the Wikipedia content into a
          beautiful timeline
        </p>
      </div>
    </div>
  );
}
