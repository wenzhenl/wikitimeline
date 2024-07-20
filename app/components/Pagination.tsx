"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ totalPages, currentPage }) => {
  const router = useRouter();

  const handlePageChange = (page: number) => {
    router.push(`/timelines?page=${page}`);
  };

  return (
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
  );
};

export default Pagination;
