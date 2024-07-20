"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface Timeline {
  pageName: string;
  wikipediaPage: string;
}

interface TimelinesTableProps {
  timelines: Timeline[];
  totalPages: number;
  currentPage: number;
}

const TimelinesTable: React.FC<TimelinesTableProps> = ({
  timelines,
  totalPages,
  currentPage,
}) => {
  const router = useRouter();

  const handlePageChange = (page: number) => {
    router.push(`/timelines?page=${page}`);
  };

  return (
    <div className="w-full max-w-3xl">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-left">
              Page Name
            </th>
            <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-left">
              Wikipedia Link
            </th>
          </tr>
        </thead>
        <tbody>
          {timelines.map((timeline, index) => (
            <tr key={index}>
              <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                <Link href={`/timeline/${timeline.pageName}`} legacyBehavior>
                  <a
                    className="text-blue-500 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {timeline.pageName.replace(/_/g, " ")}
                  </a>
                </Link>
              </td>
              <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                <a
                  href={timeline.wikipediaPage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400"
                >
                  {timeline.wikipediaPage}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex space-x-2 mt-4 justify-center">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-4 py-2 border ${
                page === currentPage
                  ? "bg-blue-500 text-white"
                  : "bg-white text-blue-500"
              } rounded-lg hover:bg-blue-600 hover:text-white`}
            >
              {page}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default TimelinesTable;
