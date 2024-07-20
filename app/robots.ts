import { MetadataRoute } from 'next';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const getRobots = (): MetadataRoute.Robots => {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
};

export default function robots(): MetadataRoute.Robots {
  return getRobots();
}