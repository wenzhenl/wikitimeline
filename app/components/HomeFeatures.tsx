export function HomeFeatures() {
  return (
    <div className="grid md:grid-cols-3 gap-8 mt-16 mb-20">
      <FeatureCard
        icon={<LightningIcon />}
        title="Instant Generation"
        description="Convert any Wikipedia article into a timeline in seconds"
        bgColor="blue"
      />
      <FeatureCard
        icon={<LayersIcon />}
        title="Multiple Pages"
        description="Compare multiple timelines side by side"
        bgColor="purple"
      />
      <FeatureCard
        icon={<EyeIcon />}
        title="Interactive View"
        description="Zoom, scroll, and explore events interactively"
        bgColor="green"
      />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: "blue" | "purple" | "green";
}

function FeatureCard({ icon, title, description, bgColor }: FeatureCardProps) {
  const bgColorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-500",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-500",
    green: "bg-green-100 dark:bg-green-900/30 text-green-500",
  };

  return (
    <div className="text-center p-6 h-full bg-white/50 dark:bg-gray-800/50 rounded-xl">
      <div
        className={`w-12 h-12 ${bgColorClasses[bgColor]} rounded-full flex items-center justify-center mx-auto mb-4`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function LightningIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
