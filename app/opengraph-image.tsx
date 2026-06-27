import { ImageResponse } from 'next/og';
import { BrandOpenGraphImage } from '@/lib/brand-icon-image';

export const alt = 'Happy First Club — Build Your Wellth';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<BrandOpenGraphImage />, { ...size });
}
