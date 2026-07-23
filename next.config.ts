import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

const apiBackendUrl = (process.env.API_BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');

const securityHeaders = [
  // Prevent the site from being embedded in iframes (clickjacking).
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  // Stop browsers from MIME-sniffing responses into executable types.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs (which can contain tokens/ids) to other origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only allow the browser features the app actually uses (tracker + photos).
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=()' },
  // Force HTTPS for a year once visited over HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/serwist/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBackendUrl}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/activity-selection',
        destination: '/create-plan?mode=first-setup',
        permanent: true,
      },
      {
        source: '/change-password',
        destination: '/settings?panel=password',
        permanent: false,
      },
      {
        source: '/support',
        destination: '/settings?panel=support',
        permanent: false,
      },
      {
        source: '/add-family-member',
        destination: '/settings?panel=add-family',
        permanent: false,
      },
    ];
  },
};

export default withSerwist(nextConfig);
