export const BRAND_NAME = 'Happy First Club';
export const BRAND_MARK = 'HF';
export const BRAND_TAGLINE = 'Build Your Wellth';
export const BRAND_DESCRIPTION =
  'Happy First Club helps you track wellness habits, follow personalized weekly plans, get WhatsApp reminders, and grow with your community.';

export const BRAND_KEYWORDS = [
  'Happy First Club',
  'wellness app',
  'habit tracking',
  'weekly wellness plan',
  'activity logging',
  'wellth',
  'WhatsApp reminders',
  'family wellness',
  'community fitness',
];

const DEFAULT_SITE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://happyfirst.vercel.app';

export function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? DEFAULT_SITE_URL;
}

export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? DEFAULT_SITE_URL;
}
