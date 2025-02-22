import Link from "next/link";
import { EmblaCarousel } from "@/app/components/EmblaCarousel";

const FEATURED_TIMELINES = [
  {
    id: 1,
    path: "George_Washington%7CQianlong_Emperor",
    image: "/featured/George_Washington_and_Qianlong_Emperor.png",
    title: "George Washington and Qianlong Emperor",
    description: "Two great leaders, two empires, one era.",
  },
  {
    id: 2,
    path: "Michelangelo%7CLeonardo_da_Vinci%7CRaphael",
    image: "/featured/Michelangelo_Leonardo_da_Vinci_Raphael.png",
    title: "Michelangelo, Leonardo da Vinci, and Raphael",
    description: "The three titans who shaped the Renaissance.",
  },
  {
    id: 3,
    path: "Li_Bai%7CDu_Fu",
    image: "/featured/Li_Bai_and_Du_Fu.png",
    title: "Li Bai and Du Fu",
    description: "The two greatest poets of China's Golden Age.",
  },
];

export function HomeFeaturedTimelines() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-4xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
        Featured Timeline Comparisons
      </h2>

      <EmblaCarousel>
        {FEATURED_TIMELINES.map((timeline) => (
          <div key={timeline.id} className="flex-[0_0_100%] mx-4 h-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transform transition-all hover:shadow-2xl h-full flex flex-col">
              <Link
                href={`/timeline/${timeline.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex-1 flex flex-col"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="relative border-8 border-white dark:border-gray-800 shadow-inner">
                    <img
                      src={timeline.image}
                      alt={`Timeline comparison of ${timeline.title}`}
                      className="w-full h-auto transform transition-all duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200 transition-colors">
                    {timeline.title}
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-400 flex-1">
                    {timeline.description}
                  </p>
                  <div className="mt-4 inline-flex items-center text-blue-500 font-medium group-hover:text-blue-600">
                    Explore Timeline
                    <svg
                      className="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </EmblaCarousel>
    </div>
  );
}
