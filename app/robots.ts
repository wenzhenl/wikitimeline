import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/app/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    sitemap: `${SITE_CONFIG.DOMAIN}/sitemap.xml`,
  };
}
