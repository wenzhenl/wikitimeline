import { Suspense } from "react";

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <Suspense>{children}</Suspense>
    </div>
  );
}
