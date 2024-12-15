function validateEnvVars() {
  if (!process.env.GOOGLE_ANALYTICS_ID) {
    throw new Error('GOOGLE_ANALYTICS_ID environment variable is not set');
  }
}

// Run validation immediately
validateEnvVars();

export const SITE_CONFIG = {
  DOMAIN: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000',
  URLS_PER_SITEMAP: 40000,
  GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
} as const 