function validateEnvVars() {
  if (!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
    throw new Error('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID environment variable is not set');
  }
}

// Run validation immediately
validateEnvVars();

export const SITE_CONFIG = {
  DOMAIN: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000',
  URLS_PER_SITEMAP: 40000,
  GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',
} as const