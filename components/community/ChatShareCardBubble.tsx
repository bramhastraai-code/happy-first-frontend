'use client';

import Link from 'next/link';
import { Award, BarChart3, Flag, Medal, Target, Trophy } from 'lucide-react';
import type { CommunityShareCard } from '@/lib/api/community';
import { cn } from '@/lib/utils';

const KIND_META: Record<
  CommunityShareCard['kind'],
  { label: string; Icon: typeof Trophy }
> = {
  activity_complete: { label: 'Activity', Icon: Flag },
  badge: { label: 'Badge', Icon: Award },
  leaderboard_rank: { label: 'Leaderboard', Icon: Trophy },
  milestone: { label: 'Milestone', Icon: Medal },
  weekly_goal: { label: 'Weekly goal', Icon: Target },
  challenge: { label: 'Challenge', Icon: BarChart3 },
};

interface ChatShareCardBubbleProps {
  card: CommunityShareCard;
  mine?: boolean;
}

export function ChatShareCardBubble({ card, mine }: ChatShareCardBubbleProps) {
  const meta = KIND_META[card.kind] || KIND_META.milestone;
  const Icon = meta.Icon;

  return (
    <div
      className={cn(
        'min-w-[220px] max-w-full overflow-hidden rounded-xl border',
        mine
          ? 'border-white/20 bg-black/10 text-primary-foreground'
          : 'border-black/5 bg-gradient-to-br from-orange-50 to-white text-[#111b21]'
      )}
    >
      <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full',
            mine ? 'bg-white/15' : 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className={cn('text-[11px] font-semibold uppercase tracking-wide', mine ? 'opacity-80' : 'text-primary')}>
          {meta.label}
        </p>
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <p className="text-[14.5px] font-semibold leading-snug">{card.title}</p>
        {card.subtitle ? (
          <p className={cn('text-[12.5px] leading-snug', mine ? 'opacity-80' : 'text-[#54656f]')}>
            {card.subtitle}
          </p>
        ) : null}
        {card.href ? (
          <Link
            href={card.href}
            className={cn(
              'inline-flex pt-1 text-[12px] font-semibold underline-offset-2 hover:underline',
              mine ? 'text-primary-foreground' : 'text-primary'
            )}
          >
            View details
          </Link>
        ) : null}
      </div>
    </div>
  );
}
