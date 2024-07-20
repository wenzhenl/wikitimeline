import { MetadataRoute } from 'next';
import { PrismaClient } from '@prisma/client';
import { BASE_URL } from "@/config";

const prisma = new PrismaClient();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const timelines = await prisma.timeline.findMany({
    select: {
      pageName: true,
    },
  });

  const staticPages: MetadataRoute.Sitemap = ['', '/timelines', '/collections', '/about'].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const dynamicPages: MetadataRoute.Sitemap = timelines.map((timeline) => ({
    url: `${BASE_URL}/timeline/${timeline.pageName}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...dynamicPages];
}