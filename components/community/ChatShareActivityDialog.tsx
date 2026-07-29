'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import {
  communityAPI,
  type CommunityShareCardKind,
} from '@/lib/api/community';
import { cn } from '@/lib/utils';

interface ChatShareActivityDialogProps {
  open: boolean;
  communityId: string;
  onClose: () => void;
  onShared: (message: Awaited<
    ReturnType<typeof communityAPI.shareActivityCard>
  >['data']['data']['message']) => void;
}

type ShareOption = {
  key: string;
  kind: CommunityShareCardKind;
  title: string;
  subtitle: string;
  href?: string;
  meta?: Record<string, unknown>;
};

export function ChatShareActivityDialog({
  open,
  communityId,
  onClose,
  onShared,
}: ChatShareActivityDialogProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ['community-dashboard', communityId, 'share-card'],
    enabled: open,
    queryFn: async () => {
      const res = await communityAPI.dashboard(communityId, { period: 'week' });
      return res.data.data.dashboard;
    },
  });

  const badgesQuery = useQuery({
    queryKey: ['community-badges', communityId, 'share-card'],
    enabled: open,
    queryFn: async () => {
      const res = await communityAPI.badges(communityId);
      return res.data.data.badges ?? [];
    },
  });

  const options = useMemo(() => {
    const list: ShareOption[] = [];
    const dash = dashboardQuery.data;
    const my = dash?.myOverall;
    if (my) {
      list.push({
        key: 'rank',
        kind: 'leaderboard_rank',
        title: `I'm #${my.rank} this week`,
        subtitle: `${my.points} pts · ${Math.round(my.contributionPercent || 0)}% contribution`,
        href: `/community/${communityId}`,
        meta: { rank: my.rank, points: my.points },
      });
      list.push({
        key: 'weekly',
        kind: 'weekly_goal',
        title: 'Weekly progress update',
        subtitle: `${my.points} points earned in the current week`,
        href: `/community/${communityId}`,
        meta: { points: my.points },
      });
    }
    for (const activity of dash?.byActivity || []) {
      const mineRow = activity.ranking?.find((r) => r.profileId === my?.profileId) || activity.ranking?.[0];
      const myPoints = mineRow && my?.profileId === mineRow.profileId ? mineRow.points : 0;
      const myValue = mineRow && my?.profileId === mineRow.profileId ? mineRow.totalValue || 0 : 0;
      if (myPoints <= 0 && myValue <= 0) continue;
      list.push({
        key: `activity-${activity.activity.id}`,
        kind: 'activity_complete',
        title: `Logged ${activity.activity.name}`,
        subtitle: `${myValue || 0} ${activity.unit || activity.activity.baseUnit || ''} · ${myPoints || 0} pts`.trim(),
        href: `/community/${communityId}`,
        meta: {
          activityId: activity.activity.id,
          value: myValue,
          points: myPoints,
        },
      });
    }
    for (const badge of badgesQuery.data || []) {
      if (!badge.unlocked) continue;
      list.push({
        key: `badge-${badge.code}`,
        kind: 'badge',
        title: `Earned ${badge.label}`,
        subtitle: badge.description || 'Community badge unlocked',
        href: `/community/${communityId}`,
        meta: { code: badge.code },
      });
    }
    if (!list.length && !dashboardQuery.isLoading && !badgesQuery.isLoading) {
      list.push({
        key: 'milestone-default',
        kind: 'milestone',
        title: 'Still showing up for the community',
        subtitle: 'Sharing a Happy First moment',
        href: `/community/${communityId}`,
      });
    }
    return list;
  }, [badgesQuery.data, badgesQuery.isLoading, communityId, dashboardQuery.data, dashboardQuery.isLoading]);

  const shareMutation = useMutation({
    mutationFn: async () => {
      const option = options.find((o) => o.key === selectedKey);
      if (!option) throw new Error('Select something to share');
      const res = await communityAPI.shareActivityCard(communityId, {
        kind: option.kind,
        title: option.title,
        subtitle: option.subtitle,
        meta: option.meta,
        href: option.href,
      });
      const message = res.data.data.message;
      if (message.messageType !== 'share_card' || !message.shareCard) {
        throw new Error(
          'Server did not create a share card (backend may need a restart). Stop npm run start in the backend terminal, start it again, then retry.'
        );
      }
      return message;
    },
    onSuccess: (message) => {
      onShared(message);
      setSelectedKey(null);
      setShareError(null);
      onClose();
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setShareError(
        axiosError.response?.data?.message || axiosError.message || 'Failed to share'
      );
    },
  });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#111b21]">Share to chat</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {dashboardQuery.isLoading || badgesQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedKey(option.key)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2.5 text-left transition',
                  selectedKey === option.key
                    ? 'border-primary bg-primary/5'
                    : 'border-black/10 hover:bg-secondary/50'
                )}
              >
                <p className="text-sm font-semibold text-[#111b21]">{option.title}</p>
                <p className="mt-0.5 text-xs text-[#667781]">{option.subtitle}</p>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={!selectedKey || shareMutation.isPending}
          onClick={() => {
            setShareError(null);
            shareMutation.mutate();
          }}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Share in chat
        </button>
        {shareError ? <p className="mt-2 text-xs text-destructive">{shareError}</p> : null}
      </div>
    </div>,
    document.body
  );
}
