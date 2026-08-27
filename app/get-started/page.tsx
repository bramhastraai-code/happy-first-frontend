'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, Loader2, Sparkles, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuthStore } from '@/lib/store/authStore';
import { communityAPI, type MyCommunityActivity } from '@/lib/api/community';
import {
  clearPendingCommunityId,
  getPendingCommunityId,
} from '@/lib/utils/pendingCommunity';
import { cn } from '@/lib/utils';

/**
 * Post-registration handhold:
 * - Community invite → show community tasks + create weekly plan
 * - Regular invite → create weekly plan only
 */
export default function GetStartedPage() {
  const router = useRouter();
  const { accessToken, isHydrated, sessionReady, selectedProfile, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [communityActivities, setCommunityActivities] = useState<MyCommunityActivity[]>([]);
  const [error, setError] = useState('');

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
        if (pendingId && selectedProfile?._id) {
          setJoining(true);
          try {
            const joinRes = await communityAPI.join(pendingId);
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
          setCommunityActivities(activitiesRes?.data?.data?.activities ?? []);
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

  const fromCommunity = communityActivities.length > 0 || Boolean(communityName);

  return (
    <MainLayout hideBottomNav>
      <div className="mx-auto max-w-lg space-y-5 px-1 py-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Welcome</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Let&apos;s get you started
          </h1>
          <p className="text-sm text-muted-foreground">
            {fromCommunity
              ? 'You joined via a community invite. Review community tasks below, then create your personal weekly plan.'
              : 'Create your first weekly plan so you can start logging activities and building streaks.'}
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {fromCommunity ? (
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
                  These show on Tasks once you&apos;re a member — create a weekly plan to track personal goals too.
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
                        {row.targetValue} {row.unit || row.baseUnit} · {row.cadence}
                        {row.communityNames?.[0] ? ` · ${row.communityNames[0]}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Community membership is ready. Your community activities will appear on the Tasks tab.
              </p>
            )}
          </section>
        ) : (
          <section className="section-card flex items-start gap-3 p-4">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Your weekly plan</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick at least 4 activities, set targets, and you&apos;re ready to log every day.
              </p>
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2">
          <Button
            className="h-12 w-full gap-2 text-base"
            onClick={() => router.push('/create-plan?mode=first-setup')}
          >
            <CalendarDays className="h-4 w-4" />
            Create weekly plan
          </Button>
          {fromCommunity ? (
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => router.push('/tasks')}
            >
              Go to tasks (community only for now)
            </Button>
          ) : null}
          <button
            type="button"
            className={cn('py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground')}
            onClick={() => router.push('/home')}
          >
            Skip for now
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
