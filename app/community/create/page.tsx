'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  CommunityAvatarPicker,
  type CommunityAvatarSelection,
} from '@/components/community/CommunityAvatarPicker';
import { activityAPI } from '@/lib/api/activity';
import { communityAPI } from '@/lib/api/community';
import { cn } from '@/lib/utils';

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | 'mind' | 'body' | 'soul'>('all');
  const [avatar, setAvatar] = useState<CommunityAvatarSelection>({
    icon: '🏃',
    avatarSeed: null,
    avatarUrl: null,
    avatarStyle: 'emoji',
    pendingFile: null,
    localPreviewUrl: null,
  });

  useEffect(() => {
    return () => {
      if (avatar.localPreviewUrl) URL.revokeObjectURL(avatar.localPreviewUrl);
    };
  }, [avatar.localPreviewUrl]);

  const activitiesQuery = useQuery({
    queryKey: ['activities', 'community-create'],
    queryFn: async () => {
      const res = await activityAPI.getList();
      return res.data.data ?? [];
    },
  });

  const activities = useMemo(() => {
    const rows = activitiesQuery.data ?? [];
    if (category === 'all') return rows;
    return rows.filter((a) => a.category?.toLowerCase() === category);
  }, [activitiesQuery.data, category]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await communityAPI.create({
        name: name.trim(),
        description: description.trim(),
        activityIds: selected,
        icon: avatar.pendingFile ? null : avatar.icon || null,
        avatarSeed: avatar.pendingFile ? null : avatar.icon ? null : avatar.avatarSeed,
        avatarUrl: avatar.pendingFile ? null : avatar.icon ? null : avatar.avatarUrl,
        avatarStyle: avatar.pendingFile
          ? 'uploaded'
          : avatar.icon
            ? 'emoji'
            : avatar.avatarStyle,
      });
      let community = res.data.data.community;
      if (avatar.pendingFile) {
        const uploadRes = await communityAPI.uploadAvatar(community.id, avatar.pendingFile);
        community = uploadRes.data.data.community;
      }
      return community;
    },
    onSuccess: (community) => {
      router.replace(`/community/${community.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not create community';
      setError(message);
    },
  });

  const toggleActivity = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const canSubmit = name.trim().length > 0 && selected.length > 0 && !createMutation.isPending;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/community"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Create community</h1>
            <p className="text-xs text-muted-foreground">
              Add an icon, name your group, and pick activities
            </p>
          </div>
        </div>

        <CommunityAvatarPicker name={name || 'Community'} value={avatar} onChange={setAvatar} />

        <div className="section-card space-y-4 p-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Community name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Morning Movers"
              className="h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What is this group about?"
              className="w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="section-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Select activities</h2>
              <p className="text-xs text-muted-foreground">
                {selected.length} selected · points come from these logs
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {(['all', 'body', 'mind', 'soul'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold capitalize',
                  category === item
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {activitiesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {activities.map((activity) => {
                const active = selected.includes(activity._id);
                return (
                  <li key={activity._id}>
                    <button
                      type="button"
                      onClick={() => toggleActivity(activity._id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                        active
                          ? 'border-primary bg-primary-soft'
                          : 'border-border bg-surface hover:bg-secondary/60'
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm">
                        {activity.icon || activity.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{activity.name}</p>
                        <p className="text-[11px] capitalize text-muted-foreground">
                          {activity.category || 'activity'} · {activity.baseUnit}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border'
                        )}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={() => {
            setError(null);
            createMutation.mutate();
          }}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            'Create community'
          )}
        </Button>
      </div>
    </MainLayout>
  );
}
