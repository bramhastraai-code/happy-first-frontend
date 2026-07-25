'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Loader2, RotateCcw, Settings2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityAddMembersPanel } from '@/components/community/CommunityAddMembersPanel';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import {
  communityAPI,
  type Community,
  type CommunityLeaderboardRow,
} from '@/lib/api/community';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useAuthStore } from '@/lib/store/authStore';

interface CommunityDashboardTabProps {
  communityId: string;
  community: Community;
  isAdmin: boolean;
}

export function CommunityDashboardTab({
  communityId,
  community,
  isAdmin,
}: CommunityDashboardTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'current' | 'weekly' | 'monthly'>('current');
  const [month, setMonth] = useState(() =>
    DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM')
  );
  const [week, setWeek] = useState(() => {
    const day = DateTime.now().setZone('Asia/Kolkata').day;
    return Math.min(5, Math.ceil(day / 7));
  });
  const [activityId, setActivityId] = useState<string>('all');
  const [viewOpen, setViewOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['community-dashboard', communityId, period, month, week],
    queryFn: async () => {
      const res = await communityAPI.dashboard(communityId, {
        period,
        month: period === 'current' ? undefined : month,
        week: period === 'weekly' ? week : undefined,
      });
      return res.data.data.dashboard;
    },
  });

  const updateMode = useMutation({
    mutationFn: (leaderboardMode: 'weekly' | 'monthly') =>
      communityAPI.update(communityId, { leaderboardMode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-dashboard', communityId] });
    },
  });

  const restart = useMutation({
    mutationFn: () => communityAPI.restartLeaderboard(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-dashboard', communityId] });
    },
  });

  const ranking: CommunityLeaderboardRow[] = useMemo(() => {
    const dash = dashboardQuery.data;
    if (!dash) return [];
    if (activityId === 'all') return dash.overall;
    const match = dash.byActivity.find((row) => row.activity.id === activityId);
    return match?.ranking ?? [];
  }, [dashboardQuery.data, activityId]);

  const monthOptions = useMemo(() => {
    const base = DateTime.now().setZone('Asia/Kolkata');
    return Array.from({ length: 6 }, (_, i) => {
      const value = base.minus({ months: i }).toFormat('yyyy-MM');
      return {
        value,
        label: DateTime.fromFormat(value, 'yyyy-MM').toFormat('LLLL yyyy'),
      };
    });
  }, []);

  const periodOptions = [
    {
      value: 'current',
      label: 'Current period',
      description: `Uses ${community.leaderboardMode} mode`,
    },
    { value: 'weekly', label: 'By week', description: 'Pick a week inside a month' },
    { value: 'monthly', label: 'By month', description: 'Full calendar month' },
  ];

  const activityOptions = [
    { value: 'all', label: 'Overall points', description: 'All community activities' },
    ...community.activities.map((activity) => ({
      value: activity.id,
      label: activity.name,
      description: activity.category || 'Activity',
    })),
  ];

  const modeOptions = [
    {
      value: 'weekly',
      label: 'Weekly mode',
      description: 'Mon–Sun week (same as home points)',
    },
    {
      value: 'monthly',
      label: 'Monthly mode',
      description: 'Current month (restart resets season)',
    },
  ];

  const weekOptions = [1, 2, 3, 4, 5].map((value) => ({
    value: String(value),
    label: `Week ${value}`,
  }));

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title="Leaderboard view"
        subtitle={
          dashboardQuery.data?.range?.label
            ? `Showing ${dashboardQuery.data.range.label}${
                period === 'current' ? ` · ${community.leaderboardMode} mode` : ''
              }`
            : 'Filter period and activity'
        }
        icon={Trophy}
        expanded={viewOpen}
        onToggle={() => setViewOpen((value) => !value)}
        overflowVisible
        contentClassName="space-y-3"
      >
        <div className="space-y-2.5">
          <CustomDropdown
            value={period}
            options={periodOptions}
            onChange={(value) => setPeriod(value as 'current' | 'weekly' | 'monthly')}
          />

          {period !== 'current' ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <CustomDropdown value={month} options={monthOptions} onChange={setMonth} />
              {period === 'weekly' ? (
                <CustomDropdown
                  value={String(week)}
                  options={weekOptions}
                  onChange={(value) => setWeek(Number(value))}
                />
              ) : null}
            </div>
          ) : null}

          <CustomDropdown
            value={activityId}
            options={activityOptions}
            onChange={setActivityId}
          />
        </div>
      </CollapsibleSection>

      {isAdmin ? (
        <>
          <CollapsibleSection
            title="Admin controls"
            subtitle="Leaderboard mode and season reset"
            icon={Settings2}
            expanded={adminOpen}
            onToggle={() => setAdminOpen((value) => !value)}
            overflowVisible
            contentClassName="space-y-3"
          >
            <CustomDropdown
              value={community.leaderboardMode}
              options={modeOptions}
              disabled={updateMode.isPending}
              onChange={(value) => updateMode.mutate(value as 'weekly' | 'monthly')}
            />

            <Button
              variant="outline"
              className="w-full justify-center"
              disabled={restart.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'Restart the monthly season board? New monthly “current” scores will count from now. Weekly boards are not affected.'
                  )
                ) {
                  restart.mutate();
                }
              }}
            >
              {restart.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restart overall board
            </Button>
          </CollapsibleSection>

          <CommunityAddMembersPanel communityId={communityId} />
        </>
      ) : null}

      <div className="section-card overflow-hidden">
        {dashboardQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : ranking.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No points logged in this period yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ranking.map((row) => {
              const isMe = String(row.profileId) === String(selectedProfile?._id);
              return (
                <li key={row.profileId} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 text-center text-xs font-bold tabular-nums text-muted-foreground">
                    {row.rank}
                  </span>
                  <ProfileAvatar
                    name={row.name}
                    avatarUrl={row.avatarUrl}
                    avatarSeed={row.avatarSeed}
                    avatarStyle={row.avatarStyle}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {row.name}
                      {isMe ? ' (you)' : ''}
                    </p>
                    <p className="text-[11px] capitalize text-muted-foreground">{row.role}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{Math.round(row.points)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
