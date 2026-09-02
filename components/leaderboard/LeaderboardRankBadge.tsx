'use client';

import { Medal } from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';
import { hasUploadedProfileAvatar } from '@/lib/utils/avatar';

interface LeaderboardRankBadgeProps {
  rank: number;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
};

export function LeaderboardRankBadge({
  rank,
  name,
  avatarUrl,
  avatarSeed,
  avatarStyle,
  size = 'md',
  className,
}: LeaderboardRankBadgeProps) {
  const isTop3 = rank >= 1 && rank <= 3;
  const showPhoto = hasUploadedProfileAvatar(avatarUrl, avatarStyle);
  const sizeClass = sizeClasses[size];

  if (showPhoto) {
    return (
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        avatarSeed={avatarSeed}
        avatarStyle={avatarStyle}
        size="sm"
        className={cn(
          'shrink-0 ring-2 ring-offset-1 ring-offset-background',
          size === 'md' ? '!h-9 !w-9' : '!h-7 !w-7',
          rank === 1 && 'ring-amber-400',
          rank === 2 && 'ring-stone-400',
          rank === 3 && 'ring-orange-400',
          !isTop3 && 'ring-border',
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        sizeClass,
        rank === 1 && 'bg-amber-100 text-amber-800',
        rank === 2 && 'bg-stone-200 text-stone-700',
        rank === 3 && 'bg-orange-100 text-orange-800',
        !isTop3 && 'bg-secondary text-muted-foreground',
        className
      )}
    >
      {isTop3 ? <Medal className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} /> : rank}
    </span>
  );
}
