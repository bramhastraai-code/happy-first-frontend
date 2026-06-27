import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/brand';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteOrigin();
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
