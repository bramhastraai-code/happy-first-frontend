'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Sparkles } from 'lucide-react';
import type { EconomySummary } from '@/lib/api/economy';
import { cn } from '@/lib/utils';

function StatRing({
  percent,
  trackClass,
  fillClass,
  children,
  label,
}: {
  percent: number;
  trackClass: string;
  fillClass: string;
  children: ReactNode;
  label: string;
}) {
  const capped = Math.min(Math.max(0, percent), 100);
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16"
      role="img"
      aria-label={label}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={trackClass}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out', fillClass)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
        {children}
      </span>
    </div>
  );
}

const tileClass =
  'flex cursor-pointer flex-col items-center gap-1.5 bg-transparent px-2 py-2.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:py-3';

function formatStat(value: number) {
  return (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

interface HomeEconomyCardsProps {
  economy: EconomySummary | null;
}

export function HomeEconomyCards({ economy }: HomeEconomyCardsProps) {
  const router = useRouter();
  if (!economy) return null;

  const { coins, xp } = economy;
  const dailyPct = Math.min(100, Math.round((xp.todayXp / Math.max(xp.dailyGoal, 1)) * 100));
  const next = xp.nextLevel;
  const remaining = next?.remaining ?? 0;
  const nextThreshold = next?.totalXp ?? 0;
  const levelPct = next
    ? Math.min(100, Math.round((xp.totalXp / Math.max(nextThreshold, 1)) * 100))
    : 100;

  return (
    <div className="xp-coins-grid grid grid-cols-3 gap-2 sm:gap-2.5">
      <button type="button" onClick={() => router.push('/coins')} className={tileClass}>
        <StatRing
          percent={100}
          trackClass="text-amber-200"
          fillClass="text-amber-500"
          label={`${formatStat(coins.balance)} coins`}
        >
          <Coins className="h-5 w-5 text-amber-600" strokeWidth={2.25} />
        </StatRing>
        <span className="text-xs font-semibold leading-none text-foreground sm:text-sm">Coins</span>
        <span className="text-sm font-bold tabular-nums leading-none text-primary sm:text-base">
          {formatStat(coins.balance)}
        </span>
        <span className="text-[9px] font-medium leading-none text-muted-foreground sm:text-[10px]">
          Earned {formatStat(coins.earned)}
        </span>
      </button>

      <button type="button" onClick={() => router.push('/xp')} className={tileClass}>
        <StatRing
          percent={dailyPct}
          trackClass="text-primary/15"
          fillClass="text-primary"
          label={`${formatStat(xp.totalXp)} XP, daily goal ${dailyPct}%`}
        >
          <Sparkles className="h-5 w-5 text-primary" strokeWidth={2.25} />
        </StatRing>
        <span className="text-xs font-semibold leading-none text-foreground sm:text-sm">XP</span>
        <span className="text-sm font-bold tabular-nums leading-none text-primary sm:text-base">
          {formatStat(xp.totalXp)}
        </span>
        <span className="text-[9px] font-medium leading-none text-muted-foreground sm:text-[10px]">
          {xp.todayXp}/{xp.dailyGoal} today
        </span>
      </button>

      <button type="button" onClick={() => router.push('/xp')} className={tileClass}>
        <StatRing
          percent={levelPct}
          trackClass="text-primary/15"
          fillClass="text-primary"
          label={`Level ${xp.level} ${xp.levelTitle}`}
        >
          <span className="text-base font-bold tabular-nums leading-none text-foreground sm:text-lg">
            {xp.level}
          </span>
        </StatRing>
        <span className="text-xs font-semibold leading-none text-foreground sm:text-sm">
          {xp.levelTitle}
        </span>
        <span className="text-sm font-bold tabular-nums leading-none text-primary sm:text-base">
          Lv {xp.level}
        </span>
        <span className="text-[9px] font-medium leading-none text-muted-foreground sm:text-[10px]">
          {next ? `${formatStat(remaining)} XP to L${next.level}` : 'Max level'}
        </span>
      </button>
    </div>
  );
}
