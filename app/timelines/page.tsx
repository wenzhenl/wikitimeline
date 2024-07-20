import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import TimelinesTable from "@/app/components/TimelinesTable";

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

export default async function TimelinesPage({ searchParams }) {
  const page = parseInt(searchParams.page) || 1;
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
        <TimelinesTable
          timelines={timelines}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      </div>
    </div>
  );
}
