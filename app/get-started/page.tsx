'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuthStore } from '@/lib/store/authStore';
import { communityAPI, type MyCommunityActivity } from '@/lib/api/community';
import {
  clearPendingCommunityId,
  getPendingCommunityId,
  getPendingCommunityInviterProfileId,
} from '@/lib/utils/pendingCommunity';
import { cn } from '@/lib/utils';

type StartPath = 'plan' | 'community' | null;

/**
 * Post-registration handhold:
 * - Choose community-only logging vs personal weekly plan first
 * - Explain what to expect from the platform
 */
export default function GetStartedPage() {
  const router = useRouter();
  const { accessToken, isHydrated, sessionReady, selectedProfile, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [communityActivities, setCommunityActivities] = useState<MyCommunityActivity[]>([]);
  const [error, setError] = useState('');
  const [path, setPath] = useState<StartPath>(null);

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setError('');
      try {
        const pendingId = getPendingCommunityId();
        const pendingInviter = getPendingCommunityInviterProfileId();
        if (pendingId && selectedProfile?._id) {
          setJoining(true);
          try {
            const joinRes = await communityAPI.join(pendingId, {
              ...(pendingInviter ? { invitedByProfileId: pendingInviter } : {}),
            });
            const community = joinRes.data.data.community;
            if (!cancelled) {
              setCommunityName(community?.name || 'Your community');
            }
          } catch {
            // Already a member or join failed — still try to load activities
          } finally {
            clearPendingCommunityId();
            setJoining(false);
          }
        }

        const [mineRes, activitiesRes] = await Promise.all([
          communityAPI.mine().catch(() => null),
          communityAPI.myActivities().catch(() => null),
        ]);

        if (!cancelled) {
          const communities = mineRes?.data?.data?.communities ?? [];
          setCommunityName((prev) => prev || communities[0]?.name || null);
          const activities = activitiesRes?.data?.data?.activities ?? [];
          setCommunityActivities(activities);
          if (activities.length > 0 || communities.length > 0) {
            setPath('community');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || 'Could not load your start options.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isHydrated, sessionReady, user, selectedProfile?._id, router]);

  if (!isHydrated || !sessionReady || loading) {
    return (
      <MainLayout hideBottomNav>
        <LoadingScreen fullScreen label={joining ? 'Joining community…' : 'Getting you started…'} />
      </MainLayout>
    );
  }

  const hasCommunity = communityActivities.length > 0 || Boolean(communityName);

  return (
    <MainLayout hideBottomNav>
      <div className="mx-auto max-w-lg space-y-5 px-1 py-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Welcome</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            How do you want to start?
          </h1>
          <p className="text-sm text-muted-foreground">
            Happy First is for personal goals, community logging, XP, coins, and inspiration.
            Pick what fits you — you can always add a plan later.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPath('community')}
            className={cn(
              'rounded-xl border px-4 py-4 text-left transition-colors',
              path === 'community'
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:bg-secondary/60'
            )}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Users className="h-4 w-4" />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Community logging</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Join or log group activities — no personal plan required
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPath('plan')}
            className={cn(
              'rounded-xl border px-4 py-4 text-left transition-colors',
              path === 'plan'
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:bg-secondary/60'
            )}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Personal weekly plan</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pick Body, Mind & Soul activities with your own targets
            </p>
          </button>
        </div>

        <section className="section-card space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">What to expect</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Tasks</strong> — log daily values after 6 PM
              </span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Happiness home</strong> — streaks, XP, coins,
                and motivation
              </span>
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Communities</strong> — shared targets, kudos,
                and chat
              </span>
            </li>
          </ul>
        </section>

        {path === 'community' && hasCommunity ? (
          <section className="section-card space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {communityName ? `${communityName} tasks` : 'Community tasks'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  These appear on Tasks — log them whenever you are ready.
                </p>
              </div>
            </div>
            {communityActivities.length > 0 ? (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {communityActivities.slice(0, 8).map((row) => (
                  <li key={row.activityId} className="flex items-center gap-3 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.label || row.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {Number(row.targetValue).toLocaleString()} {row.unit || row.baseUnit} ·{' '}
                        {row.cadence}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your community is ready — activities will appear on Tasks.
              </p>
            )}
          </section>
        ) : path === 'plan' ? (
          <section className="section-card flex items-start gap-3 p-4">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Your weekly plan</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick at least 4 activities, set targets, and start logging. You can still join
                communities anytime.
              </p>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-2">
          {path === 'plan' ? (
            <Button
              className="h-12 w-full gap-2 text-base"
              onClick={() => router.push('/create-plan?mode=first-setup')}
            >
              <CalendarDays className="h-4 w-4" />
              Create weekly plan
            </Button>
          ) : path === 'community' ? (
            <Button className="h-12 w-full gap-2 text-base" onClick={() => router.push('/tasks')}>
              <ClipboardList className="h-4 w-4" />
              Go to Tasks
            </Button>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              Choose an option above to continue
            </p>
          )}
          {path === 'community' ? (
            <Button
              variant="outline"
              className="h-11 w-full gap-2"
              onClick={() => router.push('/create-plan?mode=first-setup')}
            >
              <CalendarDays className="h-4 w-4" />
              Add a personal plan too
            </Button>
          ) : path === 'plan' && hasCommunity ? (
            <Button variant="outline" className="h-11 w-full" onClick={() => router.push('/tasks')}>
              Log community tasks first
            </Button>
          ) : null}
          <button
            type="button"
            className={cn(
              'py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground'
            )}
            onClick={() => router.push('/home')}
          >
            Skip for now — explore home
          </button>
        </div>

        {joining ? (
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Finishing community join…
          </p>
        ) : null}
      </div>
    </MainLayout>
  );
}
