import { ImageResponse } from 'next/og';
import { BrandIconImage } from '@/lib/brand-icon-image';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(<BrandIconImage size={512} radius={112} fontSize={208} />, {
    width: 512,
    height: 512,
  });
}
