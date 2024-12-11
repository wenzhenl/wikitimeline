export const SITE_CONFIG = {
  DOMAIN: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  URLS_PER_SITEMAP: 40000,
} as const 