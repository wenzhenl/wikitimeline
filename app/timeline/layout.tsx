import { Suspense } from "react";
import LoadingUI from "@/app/components/LoadingUI";

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This Suspense boundary uses a minimal placeholder during server-side rendering
  // The placeholder has no content to avoid layout shifts when the actual content loads
  return <Suspense fallback={<LoadingUI />}>{children}</Suspense>;
}
