import { MetadataRoute } from 'next';
import { BASE_URL } from "@/config";

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