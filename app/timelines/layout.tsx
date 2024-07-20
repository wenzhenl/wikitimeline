import { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: { pageName: string };
}

export const metadata: Metadata = {
  title: "Timelines - WikiTimeline",
};

export default function Layout({ children, params }: LayoutProps) {
  return <div>{children}</div>;
}
