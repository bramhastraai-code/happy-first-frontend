'use client';

import { useRouter } from 'next/navigation';
import { Coins, Sparkles } from 'lucide-react';
import type { EconomySummary } from '@/lib/api/economy';
import { cn } from '@/lib/utils';

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

  return (
    <div className="xp-coins-grid grid grid-cols-2 gap-2.5 sm:gap-3">
      <button
        type="button"
        onClick={() => router.push('/coins')}
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left',
          'outline-none transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-primary/25'
        )}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Coins className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-muted-foreground">Coins</span>
          <span className="mt-0.5 block text-base font-bold tabular-nums leading-none text-primary sm:text-lg">
            {formatStat(coins.balance)}
          </span>
          <span className="mt-1 block text-[10px] font-medium text-muted-foreground">
            Earned {formatStat(coins.earned)}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => router.push('/xp')}
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left',
          'outline-none transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-primary/25'
        )}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Sparkles className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-muted-foreground">XP</span>
          <span className="mt-0.5 block text-base font-bold tabular-nums leading-none text-primary sm:text-lg">
            {formatStat(xp.totalXp)}
          </span>
          <span className="mt-1 block text-[10px] font-medium text-muted-foreground">
            {xp.todayXp}/{xp.dailyGoal} today
          </span>
        </span>
      </button>
    </div>
  );
}
