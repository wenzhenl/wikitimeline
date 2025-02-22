export function HomeFeatures() {
  return (
    <div
      className="grid md:grid-cols-3 gap-8 mt-16 mb-20"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
        icon={<EyeIcon />}
        title="Visual Comparison"
        description="Compare multiple timelines side by side for deeper insights"
        bgColor="purple"
      />
      <FeatureCard
        icon={<ShareIcon />}
        title="Easy Sharing"
        description="Share your timelines with a simple URL"
        bgColor="pink"
      />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: "blue" | "purple" | "pink";
}

function FeatureCard({ icon, title, description, bgColor }: FeatureCardProps) {
  const gradientMap = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-pink-600",
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
        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-b ${gradientMap[bgColor]} text-white mb-4`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "3rem", // matches w-12
          height: "3rem", // matches h-12
          borderRadius: "0.75rem", // matches rounded-xl
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

function ShareIcon() {
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
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}
