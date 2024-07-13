import { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: { pageName: string };
}

export function generateMetadata({ params }: LayoutProps): Metadata {
  const { pageName } = params;
  const displayName = pageName.replace(/_/g, " ");
  return {
    title: `${displayName} - WikiTimeline`,
  };
}

export default function Layout({ children, params }: LayoutProps) {
  return <div>{children}</div>;
}
