import type { MetadataRoute } from 'next';
import { BRAND_DESCRIPTION, BRAND_NAME } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: 'Happy First',
    description: BRAND_DESCRIPTION,
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    background_color: '#f6f7f9',
    theme_color: '#ea580c',
    orientation: 'portrait-primary',
    categories: ['health', 'lifestyle', 'productivity'],
    lang: 'en-IN',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
