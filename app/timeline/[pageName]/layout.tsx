import { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: { pageName: string };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const title = decodeURIComponent(params.pageName).replace(/_/g, " ");
  const description = `Interactive timeline about ${title}`;
  const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function Layout({ children, params }: LayoutProps) {
  return <div>{children}</div>;
}
