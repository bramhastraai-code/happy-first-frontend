import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), 'public/logo.png'));
  const src = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0c0a09 0%, #1c1917 45%, #431407 100%)',
          padding: 64,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={260} height={260} alt="" />
        <p
          style={{
            marginTop: 28,
            color: '#fdba74',
            fontSize: 32,
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {BRAND_TAGLINE}
        </p>
      </div>
    ),
    { ...size }
  );
}
