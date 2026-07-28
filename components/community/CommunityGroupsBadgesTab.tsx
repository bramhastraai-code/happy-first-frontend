'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Loader2, Layers, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import { communityAPI, type CommunityGroup } from '@/lib/api/community';

interface CommunityGroupsBadgesTabProps {
  communityId: string;
  isAdmin: boolean;
}

export function CommunityGroupsBadgesTab({
  communityId,
  isAdmin,
}: CommunityGroupsBadgesTabProps) {
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ['community-groups', communityId],
    queryFn: async () => {
      const res = await communityAPI.groups(communityId);
      return res.data.data.groups ?? [];
    },
  });

  const badgesQuery = useQuery({
    queryKey: ['community-badges', communityId],
    queryFn: async () => {
      const res = await communityAPI.badges(communityId);
      return res.data.data;
    },
  });

  const groupWeekQuery = useQuery({
    queryKey: ['community-group-week', communityId, selectedGroupId],
    enabled: Boolean(selectedGroupId),
    queryFn: async () => {
      const res = await communityAPI.groupWeekView(communityId, selectedGroupId!, {
        weekOffset: 0,
      });
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      communityAPI.createGroup(communityId, {
        name: name.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community-groups', communityId] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not create group'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => communityAPI.deleteGroup(communityId, groupId),
    onSuccess: () => {
      setSelectedGroupId(null);
      void queryClient.invalidateQueries({ queryKey: ['community-groups', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    },
  });

  const groups = groupsQuery.data ?? [];
  const catalog = badgesQuery.data?.catalog ?? [];
  const analytics = groupWeekQuery.data?.analytics;

  return (
    <div className="space-y-4">
      <div className="section-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Groups</p>
              <p className="text-xs text-muted-foreground">
                Apartments, departments, or teams within this community
              </p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-2 border-b border-border px-4 py-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name (e.g. Apartment A)"
              className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create group
            </Button>
          </div>
        ) : null}

        {groupsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No groups yet{isAdmin ? ' — create one above.' : '.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((group: CommunityGroup) => (
              <li key={group.id} className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    setSelectedGroupId((id) => (id === group.id ? null : group.id))
                  }
                >
                  <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {group.memberCount} members
                    {group.description ? ` · ${group.description}` : ''}
                  </p>
                </button>
                {isAdmin ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete group"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      requestConfirm({
                        title: `Delete “${group.name}”?`,
                        description:
                          'Members in this group will become unassigned. This action cannot be undone.',
                        confirmLabel: 'Delete',
                        onConfirm: () => deleteMutation.mutateAsync(group.id),
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedGroupId && analytics ? (
        <div className="section-card space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">
            {groupWeekQuery.data?.group.name} · this week
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Score</p>
              <p className="text-xl font-bold tabular-nums">
                {Math.round(analytics.overallCommunityScore)}%
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Participation</p>
              <p className="text-xl font-bold tabular-nums">
                {Math.round(analytics.participation.rate)}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                {analytics.participation.label}
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {analytics.activities.map((a) => (
              <li key={a.activityId} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{a.name}</span>
                <span className="font-semibold tabular-nums">
                  {Math.round(a.progressPercent)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : selectedGroupId && groupWeekQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <div className="section-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Your badges</p>
              <p className="text-xs text-muted-foreground">
                Rule-based milestones for this community
              </p>
            </div>
          </div>
        </div>
        {badgesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {catalog.map((badge) => (
              <li
                key={badge.code}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span
                  className={
                    badge.unlocked
                      ? 'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary'
                      : 'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground'
                  }
                >
                  <Award className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {badge.label}
                    {badge.unlocked ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-primary">
                        Unlocked
                      </span>
                    ) : (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-muted-foreground">
                        Locked
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {ConfirmDialogElement}
    </div>
  );
}
