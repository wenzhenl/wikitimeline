interface SignInButtonProps {
  onClick?: () => void;
  className?: string;
  mobile?: boolean;
}

export default function SignInButton({
  onClick,
  className = "",
  mobile = false,
}: SignInButtonProps) {
  const baseClasses = mobile
    ? "flex items-center w-full px-3 py-2 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
    : "flex items-center px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg";

  return (
    <button onClick={onClick} className={`${baseClasses} ${className}`}>
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
      Sign In
    </button>
  );
}
