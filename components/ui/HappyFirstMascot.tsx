import { cn } from '@/lib/utils';

interface HappyFirstMascotProps {
  className?: string;
  /** Accessible name; defaults to Happy First mascot */
  title?: string;
  size?: number;
}

/**
 * Always-smiling Happy First mascot — never sad.
 * Lightweight inline SVG so empty states / overview never show a frown.
 */
export function HappyFirstMascot({
  className,
  title = 'Happy First mascot',
  size = 96,
}: HappyFirstMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <title>{title}</title>
      <circle cx="48" cy="48" r="44" fill="var(--color-primary-soft, var(--primary-soft, #fff7ed))" />
      <circle cx="48" cy="48" r="38" fill="var(--color-primary, var(--primary, #ea580c))" opacity="0.12" />
      {/* Face */}
      <circle cx="48" cy="50" r="28" fill="#F6D7B0" />
      {/* Soft blush */}
      <ellipse cx="32" cy="54" rx="5" ry="3" fill="#F4A89A" opacity="0.55" />
      <ellipse cx="64" cy="54" rx="5" ry="3" fill="#F4A89A" opacity="0.55" />
      {/* Eyes — bright, open */}
      <circle cx="38" cy="46" r="3.2" fill="#1A1A1A" />
      <circle cx="58" cy="46" r="3.2" fill="#1A1A1A" />
      <circle cx="39.1" cy="44.9" r="1" fill="#fff" />
      <circle cx="59.1" cy="44.9" r="1" fill="#fff" />
      {/* Soft brows */}
      <path
        d="M32 40c2.2-2.4 6.2-3.2 9-1.2"
        stroke="#5C4033"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M55 38.8c2.8-2 6.8-1.2 9 1.2"
        stroke="#5C4033"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Smile — always upturned */}
      <path
        d="M36 58c3.5 6.5 20.5 6.5 24 0"
        stroke="#C45C3E"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaf sprout (Happy First mark) */}
      <path
        d="M48 18c0 6 4.5 10 10 10-1.5-6-5.5-10-10-10Z"
        fill="var(--color-primary, var(--primary, #ea580c))"
      />
      <path
        d="M48 18c0 5-4 9-9 9 1.2-5.5 4.5-9 9-9Z"
        fill="var(--color-primary, var(--primary, #ea580c))"
        opacity="0.75"
      />
    </svg>
  );
}
