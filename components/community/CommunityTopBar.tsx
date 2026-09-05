'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Coins, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { economyAPI } from '@/lib/api/economy';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface CommunityTopBarProps {
  className?: string;
}

function formatCompact(value: number) {
  return (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function CommunityTopBar({ className }: CommunityTopBarProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'there';
  const profileId = selectedProfile?._id;

  const economyQuery = useQuery({
    queryKey: ['economy', 'summary', profileId ?? 'me'],
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await economyAPI.summary();
      return res.data.data;
    },
    staleTime: 30_000,
  });

  const coins = economyQuery.data?.coins?.balance ?? null;
  const xp = economyQuery.data?.xp?.totalXp ?? null;

  return (
    <AppPageHeader
      className={cn(className)}
      title={<span className="text-primary">{firstNameFrom(displayName)}</span>}
      subtitle={
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href="/coins"
            className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:text-amber-700 sm:text-xs"
          >
            <Coins className="h-3 w-3 text-amber-600" strokeWidth={2.25} aria-hidden />
            <span>{coins == null ? '—' : formatCompact(coins)}</span>
            <span className="font-medium text-muted-foreground/80">Coins</span>
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link
            href="/xp"
            className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors hover:text-primary sm:text-xs"
          >
            <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.25} aria-hidden />
            <span>{xp == null ? '—' : formatCompact(xp)}</span>
            <span className="font-medium text-muted-foreground/80">XP</span>
          </Link>
        </div>
      }
      subtitleTone="plain"
    />
  );
}
