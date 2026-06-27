import type { MetadataRoute } from 'next';
import { BRAND_DESCRIPTION, BRAND_NAME } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f7f9',
    theme_color: '#ea580c',
    orientation: 'portrait',
    categories: ['health', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    lang: 'en-IN',
    id: '/',
    scope: '/',
  };
}
