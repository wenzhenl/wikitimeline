import { SITE_CONFIG } from "@/app/config/site";
import { deviceDetection } from "@/app/utils/deviceDetection";

interface ShareButtonsProps {
  pageName: string;
  variant: "interactive" | "text";
  onEmbedClick?: () => void; // For interactive variant
  onImageClick?: () => void; // For text variant
}

export default function ShareButtons({
  pageName,
  variant,
  onEmbedClick,
  onImageClick,
}: ShareButtonsProps) {
  const isMobile = deviceDetection.isMobile();
  const hasShareApi = deviceDetection.hasShareApi();

  const pageUrl = `${SITE_CONFIG.DOMAIN}/timeline/${pageName}${
    variant === "text" ? "/text" : ""
  }`;
  const shareText = `🚀 Explore the history of ${decodeURIComponent(pageName)
    .replace(/_/g, " ")
    .replace(/,/g, ", ")} through this ${
    variant === "text" ? "text-based" : "interactive"
  } timeline! 📚 Powered by wiki-timeline.com`;

  const handleShare = async () => {
    if (isMobile && hasShareApi) {
      try {
        await navigator.share({
          title: `Timeline of ${decodeURIComponent(pageName).replace(
            /_/g,
            " "
          )}`,
          text: shareText,
          url: pageUrl,
        });
      } catch (error) {
        console.error("Sharing failed:", error);
      }
    }
  };

  // For mobile devices with share API, trigger share immediately
  if (isMobile && hasShareApi) {
    return (
      <button
        onClick={handleShare}
        className="text-blue-600 hover:text-blue-800"
      >
        Share
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(pageUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
      >
        Share on X
      </a>
      <a
        href={`https://www.reddit.com/submit?url=${encodeURIComponent(
          pageUrl
        )}&title=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
      >
        Share on Reddit
      </a>
      {variant === "interactive" && onEmbedClick && (
        <button
          onClick={onEmbedClick}
          className="text-blue-600 hover:text-blue-800"
        >
          Embed
        </button>
      )}
      {variant === "text" && onImageClick && (
        <button
          onClick={onImageClick}
          className="text-blue-600 hover:text-blue-800"
        >
          Save as Image
        </button>
      )}
    </div>
  );
}
