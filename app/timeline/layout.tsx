import { Suspense } from "react";
import LoadingUI from "@/app/components/LoadingUI";

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<LoadingUI />}>{children}</Suspense>;
}