"use client";

interface TimelineEvent {
  date: string;
  headline: string;
  text: string;
}

interface TimelineViewProps {
  data: {
    timeline: TimelineEvent[];
    errors?: { failedPages: string[] };
  } | null;
}

export default function TimelineView({ data }: TimelineViewProps) {
  if (!data || !data.timeline) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded">
        <p className="text-yellow-800 dark:text-yellow-200">
          No timeline data available.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500"></div>

      <div className="space-y-12">
        {data.timeline.map((event, index) => {
          const isNegativeYear = event.date.startsWith("-");
          const normalizedDate = isNegativeYear
            ? event.date.slice(1)
            : event.date;
          const dateParts = normalizedDate.split("-");
          const year = parseInt(dateParts[0]);

          const colors = [
            "from-blue-500 to-purple-500",
            "from-purple-500 to-pink-500",
            "from-green-500 to-teal-500",
          ];
          const gradientColor = colors[index % colors.length];

          return (
            <div key={index} className="relative flex items-start gap-6">
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-r ${gradientColor} flex items-center justify-center shadow-lg`}
                >
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-800"></div>
                </div>
              </div>

              <div className="flex-1 w-[calc(100vw-80px)] md:w-full md:min-w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 transition-all hover:shadow-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3 block whitespace-nowrap">
                  {year} {isNegativeYear ? "BC" : ""}
                  {dateParts[1] &&
                    ` ${new Date(
                      2000,
                      parseInt(dateParts[1]) - 1
                    ).toLocaleString("default", { month: "short" })}`}
                  {dateParts[2] && ` ${parseInt(dateParts[2])}`}
                </div>

                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                  {event.headline}
                </h2>

                {event.text && (
                  <p className="text-base text-gray-700 dark:text-gray-200">
                    {event.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.errors?.failedPages && data.errors.failedPages.length > 0 && (
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded">
          <p className="text-yellow-800 dark:text-yellow-200">
            Note: Could not include data from:{" "}
            {data.errors.failedPages.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
