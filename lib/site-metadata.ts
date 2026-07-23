import type { Metadata } from 'next';
import {
  BRAND_DESCRIPTION,
  BRAND_KEYWORDS,
  BRAND_NAME,
  BRAND_TAGLINE,
  getSiteOrigin,
} from '@/lib/brand';

const siteUrl = getSiteOrigin();

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s — ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  keywords: BRAND_KEYWORDS,
  authors: [{ name: BRAND_NAME, url: siteUrl }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  category: 'health',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png' },
      { url: '/icons/icon-192', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon', type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export const privateRouteMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const landingPageMetadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description: BRAND_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
};
