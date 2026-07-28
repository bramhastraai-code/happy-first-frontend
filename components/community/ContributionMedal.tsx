'use client';

import { cn } from '@/lib/utils';

export type ContributionMedalTone = 'gold' | 'silver' | 'bronze';

const TONE_BY_RANK: Record<1 | 2 | 3, ContributionMedalTone> = {
  1: 'gold',
  2: 'silver',
  3: 'bronze',
};

const MEDAL_COLORS: Record<
  ContributionMedalTone,
  { disc: string; discEdge: string; highlight: string; title: string }
> = {
  gold: {
    disc: '#F5C518',
    discEdge: '#C9920A',
    highlight: '#FFE566',
    title: '1st place',
  },
  silver: {
    disc: '#B8C0CC',
    discEdge: '#7B8796',
    highlight: '#E8ECF1',
    title: '2nd place',
  },
  bronze: {
    disc: '#D0893F',
    discEdge: '#8F4F18',
    highlight: '#E8A85C',
    title: '3rd place',
  },
};

function MedalIcon({
  rank,
  tone,
  className,
}: {
  rank: 1 | 2 | 3;
  tone: ContributionMedalTone;
  className?: string;
}) {
  const colors = MEDAL_COLORS[tone];
  const id = `contribution-medal-${tone}-${rank}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-disc`} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.highlight} />
          <stop offset="0.42" stopColor={colors.disc} />
          <stop offset="1" stopColor={colors.discEdge} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="8" y1="8" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="16" cy="16" r="14" fill={`url(#${id}-disc)`} />
      <circle cx="16" cy="16" r="14" stroke={colors.discEdge} strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1.25" />
      <ellipse cx="12.5" cy="11.5" rx="5" ry="3.2" fill={`url(#${id}-shine)`} />

      <text
        x="16"
        y="17"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFFFFF"
        fontSize="13"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}

/**
 * Compact gold / silver / bronze medal for Community Member Contribution top 3.
 * Icon-only circular medals — ranking still comes from existing leaderboard rows.
 */
export function ContributionMedal({
  rank,
  className,
  size = 'sm',
}: {
  rank: number;
  className?: string;
  size?: 'sm' | 'md';
}) {
  if (rank !== 1 && rank !== 2 && rank !== 3) return null;

  const tone = TONE_BY_RANK[rank];
  const colors = MEDAL_COLORS[tone];
  const iconSize = size === 'md' ? 'h-8 w-8' : 'h-7 w-7';

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      title={colors.title}
      aria-label={colors.title}
    >
      <MedalIcon rank={rank} tone={tone} className={iconSize} />
    </span>
  );
}

export function contributionMedalToneForRank(rank: number): ContributionMedalTone | null {
  if (rank === 1 || rank === 2 || rank === 3) return TONE_BY_RANK[rank];
  return null;
}
