"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const ITEMS_PER_PAGE = 10;

export default function TimelinesPage() {
  const [timelines, setTimelines] = useState<
    { pageName: string; link: string }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchTimelines = async (page: number) => {
      const response = await fetch(
        `/api/timelines?page=${page}&limit=${ITEMS_PER_PAGE}`
      );
      const data = await response.json();
      setTimelines(data.items);
      setTotalPages(data.totalPages);
    };

    fetchTimelines(currentPage);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Timelines
      </h1>
      <div className="w-full max-w-3xl grid grid-cols-2 gap-4">
        {timelines.map((timeline, index) => (
          <div key={index} className="flex flex-col mb-4">
            <Link href={`/timeline/${timeline.pageName}`} legacyBehavior>
              <a className="text-blue-500 hover:underline">
                {timeline.pageName.replace(/_/g, " ")}
              </a>
            </Link>
            <a
              href={`https://en.wikipedia.org/wiki/${timeline.pageName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400"
            >
              Original Wikipedia Page
            </a>
          </div>
        ))}
      </div>
      <div className="flex space-x-2 mt-4">
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
}
