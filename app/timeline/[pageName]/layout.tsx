import { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: { pageName: string };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const title = decodeURIComponent(params.pageName).replace(/_/g, " ");
  const description = `Interactive timeline about ${title}`;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/timeline/${params.pageName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
    },
    alternates: {
      types: {
        'application/json+oembed': `${process.env.NEXT_PUBLIC_BASE_URL}/api/oembed?url=${encodeURIComponent(url)}`,
      },
    },
    other: {
      'twitter:player': `${process.env.NEXT_PUBLIC_BASE_URL}/timeline/${params.pageName}/embed`,
      'twitter:player:width': '560',
      'twitter:player:height': '315',
      'twitter:card': 'player',
    }
  };
}

export default function Layout({ children, params }: LayoutProps) {
  return <div>{children}</div>;
}
