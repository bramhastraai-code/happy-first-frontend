import { ImageResponse } from 'next/og';
import { BrandIconImage } from '@/lib/brand-icon-image';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(<BrandIconImage size={192} radius={42} fontSize={78} />, {
    width: 192,
    height: 192,
  });
}
