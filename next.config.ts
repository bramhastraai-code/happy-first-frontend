import type { NextConfig } from 'next';

const apiBackendUrl = (process.env.API_BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');

const nextConfig: NextConfig = {
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

export default nextConfig;
