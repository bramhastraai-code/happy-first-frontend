'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AVATAR_STYLE,
  buildDiceBearAvatarUrl,
  isBrandAssetAvatarUrl,
  resolveProfileAvatarUrl,
} from '@/lib/utils/avatar';

interface ProfileAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: 'full' | 'xl' | '2xl';
}

const sizeClass = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-xl',
};

const roundedClass = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export function ProfileAvatar({
  name,
  avatarUrl,
  avatarSeed,
  avatarStyle,
  size = 'md',
  className,
  rounded = 'full',
}: ProfileAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = (name || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    setFailedSrc(null);
  }, [avatarUrl, avatarSeed, avatarStyle, name]);

  const src = useMemo(() => {
    const resolved = resolveProfileAvatarUrl({
      avatarUrl,
      avatarSeed,
      avatarStyle,
      name: name || undefined,
    });
    if (resolved && resolved !== failedSrc && !isBrandAssetAvatarUrl(resolved)) {
      return resolved;
    }
    if (failedSrc && (avatarSeed || name)) {
      const fallback = buildDiceBearAvatarUrl(
        avatarSeed || name || 'happy',
        avatarStyle && avatarStyle !== 'uploaded' ? avatarStyle : AVATAR_STYLE
      );
      if (fallback !== failedSrc) return fallback;
    }
    return resolved && resolved !== failedSrc ? resolved : null;
  }, [avatarUrl, avatarSeed, avatarStyle, name, failedSrc]);

  const frameClass = cn(
    'shrink-0 bg-primary-soft object-cover',
    sizeClass[size],
    roundedClass[rounded],
    className
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name} avatar` : 'Profile avatar'}
        className={frameClass}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-primary-hover font-bold text-primary-foreground',
        sizeClass[size],
        roundedClass[rounded],
        className
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
