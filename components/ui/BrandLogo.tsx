import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BRAND_MARK, BRAND_NAME } from '@/lib/brand';

interface BrandLogoProps {
  href?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const markSizes = {
  sm: 'h-8 w-8 text-xs rounded-xl',
  md: 'h-10 w-10 text-sm rounded-2xl',
  lg: 'h-11 w-11 text-sm rounded-2xl',
} as const;

const textSizes = {
  sm: 'text-sm',
  md: 'text-base sm:text-lg',
  lg: 'text-lg',
} as const;

export function BrandLogo({
  href = '/',
  variant = 'dark',
  size = 'md',
  className,
}: BrandLogoProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-primary font-bold text-primary-foreground shadow-sm',
          markSizes[size]
        )}
      >
        {BRAND_MARK}
      </span>
      <span
        className={cn(
          'font-bold tracking-tight',
          textSizes[size],
          variant === 'light' ? 'text-white' : 'text-foreground'
        )}
      >
        {BRAND_NAME}
      </span>
    </>
  );

  const classes = cn('inline-flex min-w-0 items-center gap-2.5', className);

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${BRAND_NAME} home`}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
