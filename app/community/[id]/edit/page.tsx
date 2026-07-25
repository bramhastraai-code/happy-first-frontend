'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  CommunityAvatarPicker,
  type CommunityAvatarSelection,
} from '@/components/community/CommunityAvatarPicker';
import { activityAPI } from '@/lib/api/activity';
import { communityAPI } from '@/lib/api/community';
import { cn } from '@/lib/utils';

export default function EditCommunityPage() {
  const params = useParams<{ id: string }>();
  const communityId = String(params?.id || '');
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const [hydrated, setHydrated] = useState(false);

  const communityQuery = useQuery({
    queryKey: ['community', communityId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      const res = await communityAPI.get(communityId);
      return res.data.data.community;
    },
  });

  const activitiesQuery = useQuery({
    queryKey: ['activities', 'community-edit'],
    queryFn: async () => {
      const res = await activityAPI.getList();
      return res.data.data ?? [];
    },
  });

  useEffect(() => {
    const community = communityQuery.data;
    if (!community || hydrated) return;
    if (community.myRole !== 'admin') {
      router.replace(`/community/${communityId}`);
      return;
    }
    setName(community.name || '');
    setDescription(community.description || '');
    setSelected(community.activities.map((a) => a.id));
    setAvatar({
      icon: community.icon || null,
      avatarSeed: community.avatarSeed || null,
      avatarUrl: community.avatarUrl || null,
      avatarStyle: community.avatarStyle || (community.icon ? 'emoji' : 'icons'),
      pendingFile: null,
      localPreviewUrl: null,
    });
    setHydrated(true);
  }, [communityQuery.data, hydrated, communityId, router]);

  useEffect(() => {
    return () => {
      if (avatar.localPreviewUrl) URL.revokeObjectURL(avatar.localPreviewUrl);
    };
  }, [avatar.localPreviewUrl]);

  const activities = useMemo(() => {
    const rows = activitiesQuery.data ?? [];
    if (category === 'all') return rows;
    return rows.filter((a) => a.category?.toLowerCase() === category);
  }, [activitiesQuery.data, category]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await communityAPI.update(communityId, {
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
        const uploadRes = await communityAPI.uploadAvatar(communityId, avatar.pendingFile);
        community = uploadRes.data.data.community;
      }
      return community;
    },
    onSuccess: async (community) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community', communityId] }),
        queryClient.invalidateQueries({ queryKey: ['communities'] }),
      ]);
      router.replace(`/community/${community.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save community';
      setError(message);
    },
  });

  const toggleActivity = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const canSubmit =
    name.trim().length > 0 && selected.length > 0 && !saveMutation.isPending && hydrated;

  if (communityQuery.isLoading || !hydrated) {
    return (
      <MainLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/community/${communityId}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Edit community</h1>
            <p className="text-xs text-muted-foreground">Update icon, name, and activities</p>
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
              className="h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="section-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Activities</h2>
            <p className="text-xs text-muted-foreground">{selected.length} selected</p>
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
            <ul className="max-h-[45vh] space-y-2 overflow-y-auto">
              {activities.map((activity) => {
                const active = selected.includes(activity._id);
                return (
                  <li key={activity._id}>
                    <button
                      type="button"
                      onClick={() => toggleActivity(activity._id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left',
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
                          {activity.category || 'activity'}
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
            saveMutation.mutate();
          }}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </MainLayout>
  );
}
