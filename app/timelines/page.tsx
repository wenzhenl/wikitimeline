import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import TimelinesTable from "@/app/components/TimelinesTable";
import Pagination from "@/app/components/Pagination";

const prisma = new PrismaClient();

const ITEMS_PER_PAGE = 10;

async function getTimelines(page: number) {
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const [timelines, totalItems] = await Promise.all([
    prisma.timeline.findMany({
      skip,
      take: ITEMS_PER_PAGE,
      select: {
        pageName: true,
        wikipediaPage: true,
      },
    }),
    prisma.timeline.count(),
  ]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return { timelines, totalPages, currentPage: page };
}

interface TimelinesPageProps {
  searchParams: { page?: string };
}

const TimelinesPage = async ({ searchParams }: TimelinesPageProps) => {
  const page = parseInt(searchParams.page || "1", 10);
  const { timelines, totalPages, currentPage } = await getTimelines(page);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between mb-8">
          <Link href="/" legacyBehavior>
            <a className="text-blue-500 hover:underline text-2xl">Home</a>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Timelines
          </h1>
        </div>
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-left">
                Timeline
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
        <Pagination totalPages={totalPages} currentPage={currentPage} />
      </div>
    </div>
  );
};

export default TimelinesPage;
