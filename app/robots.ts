import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/brand';
import { ROBOTS_DISALLOW_PATHS } from '@/lib/navigation/seoRoutes';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
