'use client';

/** Shared chat wallpaper for community + feed DMs. */
export const chatWallpaperStyle = {
  backgroundColor: '#efeae2',
  backgroundImage: `
    radial-gradient(circle at 12% 18%, rgba(0,0,0,0.035) 0 1.1px, transparent 1.2px),
    radial-gradient(circle at 72% 28%, rgba(0,0,0,0.03) 0 1px, transparent 1.1px),
    radial-gradient(circle at 38% 62%, rgba(0,0,0,0.028) 0 1.2px, transparent 1.3px),
    radial-gradient(circle at 88% 78%, rgba(0,0,0,0.032) 0 1px, transparent 1.1px)
  `,
  backgroundSize: '42px 42px, 36px 36px, 48px 48px, 40px 40px',
} as const;
