import { ImageResponse } from 'next/og';
import { BrandMaskableIconImage } from '@/lib/brand-icon-image';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(<BrandMaskableIconImage size={512} />, {
    width: 512,
    height: 512,
  });
}
