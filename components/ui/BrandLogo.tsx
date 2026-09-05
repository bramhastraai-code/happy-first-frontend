import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';

interface BrandLogoProps {
  href?: string;
  /** `light` = cream/orange mark on dark UI; `dark` = cream icon on light UI. */
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  /** Large centered mark for auth screens. */
  wordmark?: boolean;
  className?: string;
}

const imageSizes = {
  sm: { className: 'h-9 w-9', px: 36 },
  md: { className: 'h-11 w-11', px: 44 },
  lg: { className: 'h-16 w-16', px: 64 },
} as const;

export function BrandLogo({
  href = '/',
  variant = 'dark',
  size = 'md',
  wordmark = false,
  className,
}: BrandLogoProps) {
  const src = variant === 'light' ? '/logo-dark.png' : '/logo.png';

  const image = (
    <Image
      src={src}
      alt=""
      width={wordmark ? 200 : imageSizes[size].px}
      height={wordmark ? 200 : imageSizes[size].px}
      className={cn(
        'object-contain',
        wordmark ? 'h-28 w-28 sm:h-36 sm:w-36' : imageSizes[size].className
      )}
      priority
    />
  );

  const classes = cn(
    'inline-flex min-w-0 items-center',
    wordmark && 'justify-center',
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${BRAND_NAME} home`}>
        {image}
      </Link>
    );
  }

  return <div className={classes}>{image}</div>;
}
