'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
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

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CommunityType>('public');
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

  const defaultsQuery = useQuery({
    queryKey: ['community-target-defaults'],
    queryFn: async () => {
      const res = await communityAPI.targetDefaults();
      return res.data.data.defaults ?? {};
    },
  });

  const activities = useMemo(() => {
    const rows = activitiesQuery.data ?? [];
    if (category === 'all') return rows;
    return rows.filter((a) => a.category?.toLowerCase() === category);
  }, [activitiesQuery.data, category]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const activityConfig = Object.entries(selectedLevels).map(([activityId, level]) => ({
        activityId,
        level,
      }));
      const res = await communityAPI.create({
        name: name.trim(),
        description: description.trim(),
        type,
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
    !createMutation.isPending;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/community"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Create community</h1>
            <p className="text-xs text-muted-foreground">
              Choose type, activities, and a level for each activity
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
