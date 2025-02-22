export function HomeFeatures() {
  // For mobile: default to 1 column
  // For md (768px) and up: 3 columns
  const gridTemplateColumns =
    window.innerWidth >= 768 ? "repeat(3, minmax(0, 1fr))" : "minmax(0, 1fr)";

  return (
    <div
      className="grid md:grid-cols-3 gap-8 mt-16 mb-20"
      style={{
        display: "grid",
        gridTemplateColumns, // This will be overridden by Tailwind's md:grid-cols-3
        gap: "2rem", // matches gap-8
        marginTop: "4rem", // matches mt-16
        marginBottom: "5rem", // matches mb-20
      }}
    >
      <FeatureCard
        icon={<LightningIcon />}
        title="Instant Generation"
        description="Convert any Wikipedia article into a timeline in seconds"
        bgColor="blue"
      />
      <FeatureCard
        icon={<MenuIcon />}
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
  const gradientMap = {
    blue: "from-blue-200 to-blue-300",
    purple: "from-purple-200 to-purple-300",
    green: "from-green-200 to-green-300",
  };

  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      style={{
        position: "relative",
        padding: "1.5rem", // matches p-6
        borderRadius: "1rem", // matches rounded-2xl
        minHeight: "16rem", // ensure consistent height
      }}
    >
      <div
        className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-b ${gradientMap[bgColor]} text-gray-700 mb-4`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "3rem", // matches w-12
          height: "3rem", // matches h-12
          borderRadius: "9999px", // matches rounded-full
          marginBottom: "1rem", // matches mb-4
        }}
      >
        {icon}
      </div>
      <h3
        className="text-xl font-semibold mb-2 text-gray-900 dark:text-white"
        style={{
          fontSize: "1.25rem", // matches text-xl
          fontWeight: "600", // matches font-semibold
          marginBottom: "0.5rem", // matches mb-2
        }}
      >
        {title}
      </h3>
      <p
        className="text-gray-600 dark:text-gray-300"
        style={{
          lineHeight: "1.5",
        }}
      >
        {description}
      </p>
    </div>
  );
}

function LightningIcon() {
  return (
    <svg
      className="w-6 h-6"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      className="w-6 h-6"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className="w-6 h-6"
      width="24"
      height="24"
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
