'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  CommunityAvatarPicker,
  type CommunityAvatarSelection,
} from '@/components/community/CommunityAvatarPicker';
import { CommunityActivityConfigPicker } from '@/components/community/CommunityActivityConfigPicker';
import { activityAPI } from '@/lib/api/activity';
import {
  COMMUNITY_TYPE_OPTIONS,
  communityAPI,
  type CommunityActivityLevel,
  type CommunityType,
} from '@/lib/api/community';
import { cn } from '@/lib/utils';

export default function EditCommunityPage() {
  const params = useParams<{ id: string }>();
  const communityId = String(params?.id || '');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CommunityType>('public');
  const [allowAdminWhatsApp, setAllowAdminWhatsApp] = useState(true);
  const [allowMemberWhatsApp, setAllowMemberWhatsApp] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<Record<string, CommunityActivityLevel>>(
    {}
  );
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

  const defaultsQuery = useQuery({
    queryKey: ['community-target-defaults'],
    queryFn: async () => {
      const res = await communityAPI.targetDefaults();
      return res.data.data.defaults ?? {};
    },
  });

  useEffect(() => {
    const community = communityQuery.data;
    if (!community || hydrated) return;
    if (community.myRole !== 'admin') {
      router.replace(`/community/${communityId}`);
      return;
    }
    if (community.status === 'deleted') {
      router.replace(`/community/${communityId}`);
      return;
    }
    setName(community.name || '');
    setDescription(community.description || '');
    setType(community.type || (community.isPublic === false ? 'private' : 'public'));
    setAllowAdminWhatsApp(community.allowAdminWhatsApp !== false);
    setAllowMemberWhatsApp(Boolean(community.allowMemberWhatsApp));
    const levels: Record<string, CommunityActivityLevel> = {};
    const sourceConfig =
      community.pendingActivityConfig?.length
        ? community.pendingActivityConfig
        : community.activityConfig;
    if (sourceConfig?.length) {
      sourceConfig.forEach((row) => {
        levels[row.activityId] = row.level || 'active';
      });
    } else {
      community.activities.forEach((a) => {
        levels[a.id] = 'active';
      });
    }
    setSelectedLevels(levels);
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
      const activityConfig = Object.entries(selectedLevels).map(([activityId, level]) => ({
        activityId,
        level,
      }));
      const res = await communityAPI.update(communityId, {
        name: name.trim(),
        description: description.trim(),
        type,
        allowAdminWhatsApp,
        allowMemberWhatsApp,
        activityConfig,
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
        queryClient.invalidateQueries({ queryKey: ['community-my-activities'] }),
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

  const clearPendingMutation = useMutation({
    mutationFn: () =>
      communityAPI.update(communityId, { clearPendingActivityConfig: true }),
    onSuccess: async (res) => {
      const community = res.data.data.community;
      const levels: Record<string, CommunityActivityLevel> = {};
      if (community.activityConfig?.length) {
        community.activityConfig.forEach((row) => {
          levels[row.activityId] = row.level || 'active';
        });
      } else {
        community.activities.forEach((a) => {
          levels[a.id] = 'active';
        });
      }
      setSelectedLevels(levels);
      await queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not clear next-week schedule';
      setError(message);
    },
  });

  const toggleActivity = (id: string) => {
    setSelectedLevels((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 'active' };
    });
  };

  const canSubmit =
    name.trim().length > 0 &&
    Object.keys(selectedLevels).length > 0 &&
    !saveMutation.isPending &&
    hydrated;

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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Edit community</h1>
            <p className="text-xs text-muted-foreground">
              Update type, activities, and weekly target levels
            </p>
          </div>
        </div>

        {communityQuery.data?.activityConfigLocked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Current week is locked</p>
            <p className="mt-1 text-xs text-amber-800/90">
              Members have already logged this week. Activity changes will apply on the next Monday
              reset
              {communityQuery.data.hasPendingActivityConfig
                ? ' (a next-week schedule is already saved).'
                : '.'}
            </p>
            {communityQuery.data.hasPendingActivityConfig ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={clearPendingMutation.isPending || saveMutation.isPending}
                onClick={() => {
                  setError(null);
                  clearPendingMutation.mutate();
                }}
              >
                {clearPendingMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Clear next-week schedule
              </Button>
            ) : null}
          </div>
        ) : null}

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

          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">Community type</span>
            <div className="space-y-2">
              {COMMUNITY_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                    type === option.value
                      ? 'border-primary bg-primary-soft'
                      : 'border-border bg-surface hover:bg-secondary/60'
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground">WhatsApp</p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={allowAdminWhatsApp}
                onChange={(e) => setAllowAdminWhatsApp(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Allow community admins to send WhatsApp
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Admins can open a WhatsApp chat with members from the members list.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={allowMemberWhatsApp}
                onChange={(e) => setAllowMemberWhatsApp(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Allow other members to send WhatsApp
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Regular members can also open WhatsApp to other members.
                </span>
              </span>
            </label>
          </div>
        </div>

        <CommunityActivityConfigPicker
          activities={activities}
          loading={activitiesQuery.isLoading}
          category={category}
          onCategoryChange={setCategory}
          selectedLevels={selectedLevels}
          onToggle={toggleActivity}
          onLevelChange={(activityId, level) =>
            setSelectedLevels((prev) => ({ ...prev, [activityId]: level }))
          }
          targetDefaults={defaultsQuery.data}
        />

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
          ) : communityQuery.data?.activityConfigLocked ? (
            'Save for next week'
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </MainLayout>
  );
}
