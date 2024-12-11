export const SITE_CONFIG = {
  DOMAIN: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000',
  URLS_PER_SITEMAP: 5,
} as const 