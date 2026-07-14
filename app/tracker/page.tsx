'use client';

import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import DashboardStats from '@/components/tracker/DashboardStats';
import ActivityCard from '@/components/tracker/ActivityCard';
import GoalProgress from '@/components/tracker/GoalProgress';
import TrackerHeader from '@/components/tracker/TrackerHeader';
import { Button } from '@/components/ui/button';
import { useDashboardStats, useGoals, useAchievements } from '@/lib/tracker/hooks/useActivity';
import { History, MapPin, Play, Target, Trophy } from 'lucide-react';

const QUICK_LINKS = [
  { href: '/tracker/live', label: 'Start', icon: Play },
  { href: '/tracker/history', label: 'History', icon: History },
  { href: '/tracker/goals', label: 'Goals', icon: Target },
] as const;

export default function TrackerDashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: goals } = useGoals();
  const { data: achievements } = useAchievements();

  return (
    <MainLayout>
      <div className="space-y-5 py-4 sm:space-y-6 sm:py-6">
        <TrackerHeader
          title="Fitness Tracker"
          subtitle="GPS workouts with live maps and stats"
          backHref="/home"
          backLabel="Back to home"
          action={
            <Button asChild size="sm" className="hidden h-10 rounded-xl sm:inline-flex">
              <Link href="/tracker/live">
                <Play className="mr-1.5 h-4 w-4" />
                Start
              </Link>
            </Button>
          }
        />

        <div className="section-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary-soft/70 via-surface to-surface p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <MapPin className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground">Ready to move?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track distance, pace, and calories with live GPS on your phone.
              </p>
            </div>
          </div>
          <Button asChild className="mt-4 h-12 w-full rounded-2xl text-base font-semibold sm:hidden">
            <Link href="/tracker/live">
              <Play className="mr-2 h-5 w-5" />
              Start workout
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface p-3 text-center transition-colors active:bg-accent"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </div>

        <DashboardStats stats={stats} loading={isLoading} />

        {achievements && achievements.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <h2 className="section-title">Achievements</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {achievements.map((a) => (
                <span
                  key={a._id}
                  className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  {a.meta?.label || a.code}
                </span>
              ))}
            </div>
          </section>
        )}

        {goals && goals.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="section-title">Goals</h2>
              <Link href="/tracker/goals" className="text-xs font-semibold text-primary">
                Manage
              </Link>
            </div>
            <GoalProgress goals={goals} />
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="section-title">Recent workouts</h2>
            {stats?.recent?.length ? (
              <Link href="/tracker/history" className="text-xs font-semibold text-primary">
                See all
              </Link>
            ) : null}
          </div>
          {stats?.recent?.length ? (
            <div className="space-y-3">
              {stats.recent.map((session) => (
                <ActivityCard key={session._id} session={session} compact />
              ))}
            </div>
          ) : (
            <div className="section-card flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <MapPin className="h-7 w-7" />
              </span>
              <div>
                <p className="font-semibold text-foreground">No workouts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start your first GPS session and your route will show up here.
                </p>
              </div>
              <Button asChild className="h-11 rounded-xl">
                <Link href="/tracker/live">Start workout</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
