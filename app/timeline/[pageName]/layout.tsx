import { Metadata } from "next";
import { SITE_CONFIG } from '@/app/config/site'

interface LayoutProps {
  children: React.ReactNode;
  params: { pageName: string };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const title = decodeURIComponent(params.pageName).replace(/_/g, " ");
  const description = `Interactive timeline about ${title}`;
  const url = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      videos: [{
        url: `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/embed`,
        width: 560,
        height: 315,
        type: 'text/html',
      }],
    },
    alternates: {
      types: {
        'application/json+oembed': `${SITE_CONFIG.DOMAIN}/api/oembed?url=${encodeURIComponent(url)}`,
      },
    },
    other: {
      'twitter:card': 'player',
      'twitter:player': `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}/embed`,
      'twitter:player:width': '560',
      'twitter:player:height': '315',
    }
  };
}

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { pageName: string };
}) {
  const url = `${SITE_CONFIG.DOMAIN}/timeline/${params.pageName}`;
  
  return (
    <>
      <head>
        <link 
          rel="alternate" 
          type="application/json+oembed" 
          href={`${SITE_CONFIG.DOMAIN}/api/oembed?url=${encodeURIComponent(url)}`}
          title={decodeURIComponent(params.pageName).replace(/_/g, " ")}
        />
      </head>
      <div>{children}</div>
    </>
  );
}
