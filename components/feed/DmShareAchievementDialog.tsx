'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { dailyLogAPI } from '@/lib/api/dailyLog';
import { messagesAPI, type FeedChatMessage } from '@/lib/api/messages';
import type { CommunityShareCardKind } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface DmShareAchievementDialogProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onShared: (message: FeedChatMessage) => void;
}

type ShareOption = {
  key: string;
  kind: CommunityShareCardKind;
  title: string;
  subtitle: string;
  href?: string;
  meta?: Record<string, unknown>;
};

export function DmShareAchievementDialog({
  open,
  conversationId,
  onClose,
  onShared,
}: DmShareAchievementDialogProps) {
  const { selectedProfile, user } = useAuthStore();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const streakQuery = useQuery({
    queryKey: ['dm-share-streak', selectedProfile?._id],
    enabled: open && !!selectedProfile?._id,
    queryFn: async () => {
      const res = await dailyLogAPI.getStreaks(selectedProfile!._id);
      return res.data.data;
    },
  });

  const options = useMemo(() => {
    const list: ShareOption[] = [];
    const streak = streakQuery.data?.overallStreak?.currentStreak ?? 0;
    const longest = streakQuery.data?.overallStreak?.longestStreak ?? 0;
    const points = Number(user?.HappyPoints || 0);

    if (streak > 0) {
      list.push({
        key: 'streak',
        kind: 'milestone',
        title: `${streak}-day streak`,
        subtitle: 'Keeping the Happy First habit going',
        href: '/streak-calendar',
        meta: { streak },
      });
    }
    if (longest > 0) {
      list.push({
        key: 'longest',
        kind: 'badge',
        title: `Best streak: ${longest} days`,
        subtitle: 'Personal best so far',
        href: '/streak-calendar',
        meta: { longest },
      });
    }
    list.push({
      key: 'points',
      kind: 'weekly_goal',
      title: `${points} Happy Points`,
      subtitle: 'My wellness score on Happy First Club',
      href: '/home',
      meta: { points },
    });
    list.push({
      key: 'checkin',
      kind: 'activity_complete',
      title: 'Logged my activities today',
      subtitle: selectedProfile?.name
        ? `${selectedProfile.name} checked in on Happy First`
        : 'Daily check-in complete',
      href: '/tasks',
    });
    return list;
  }, [streakQuery.data, user, selectedProfile?.name]);

  const shareMutation = useMutation({
    mutationFn: async (option: ShareOption) => {
      const res = await messagesAPI.shareAchievement(conversationId, {
        kind: option.kind,
        title: option.title,
        subtitle: option.subtitle,
        href: option.href,
        meta: option.meta,
      });
      return res.data.data.message;
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
        axiosError.response?.data?.message || axiosError.message || 'Could not share'
      );
    },
  });

  if (!open || typeof document === 'undefined') return null;

  const selected = options.find((o) => o.key === selectedKey) || null;

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#111b21]">Share achievement</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {streakQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedKey(option.key)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                  selectedKey === option.key
                    ? 'border-primary bg-primary/5'
                    : 'border-black/5 hover:bg-secondary/60'
                )}
              >
                <p className="text-sm font-semibold text-[#111b21]">{option.title}</p>
                <p className="mt-0.5 text-xs text-[#667781]">{option.subtitle}</p>
              </button>
            ))}
          </div>
        )}

        {shareError ? <p className="mt-2 text-xs text-destructive">{shareError}</p> : null}

        <button
          type="button"
          disabled={!selected || shareMutation.isPending}
          onClick={() => selected && shareMutation.mutate(selected)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Share in chat
        </button>
      </div>
    </div>,
    document.body
  );
}
