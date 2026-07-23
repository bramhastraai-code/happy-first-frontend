/** Shared mark for app/icon, apple-icon, opengraph-image, and PWA icon routes. */
export function BrandIconImage({
  size,
  radius,
  fontSize,
}: {
  size: number;
  radius: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
        borderRadius: radius,
        boxShadow: '0 8px 24px rgba(234, 88, 12, 0.35)',
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        HF
      </span>
    </div>
  );
}

/** Full-bleed mark with safe padding for Android maskable icons. */
export function BrandMaskableIconImage({ size }: { size: number }) {
  const inset = Math.round(size * 0.2);
  const markSize = size - inset * 2;
  const fontSize = Math.round(markSize * 0.42);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#c2410c',
      }}
    >
      <div
        style={{
          width: markSize,
          height: markSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
          borderRadius: Math.round(markSize * 0.22),
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          HF
        </span>
      </div>
    </div>
  );
}

export function BrandOpenGraphImage() {
  return (
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
      <BrandIconImage size={120} radius={28} fontSize={52} />
      <p
        style={{
          marginTop: 36,
          color: '#ffffff',
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        Happy First Club
      </p>
      <p
        style={{
          marginTop: 16,
          color: '#fdba74',
          fontSize: 28,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Build Your Wellth
      </p>
    </div>
  );
}
