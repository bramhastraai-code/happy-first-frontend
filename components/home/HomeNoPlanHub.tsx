'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ClipboardList,
  Compass,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeMotivationCard } from '@/components/home/HomeMotivationCard';

const PLATFORM_STEPS = [
  {
    icon: CalendarDays,
    title: 'Weekly plan (optional)',
    detail: 'Pick Body, Mind & Soul activities with targets — or skip and log community tasks only.',
  },
  {
    icon: ClipboardList,
    title: 'Daily logging',
    detail: 'Enter values on Tasks after 6 PM to keep streaks, earn XP, and collect coins.',
  },
  {
    icon: Users,
    title: 'Communities',
    detail: 'Join groups, hit shared targets, send kudos, and chat with members.',
  },
  {
    icon: Sparkles,
    title: 'XP & motivation',
    detail: 'Track progress on Happiness home, Inspiration feed, and your XP level.',
  },
];

interface HomeNoPlanHubProps {
  hasCommunityActivities?: boolean;
  communityActivityCount?: number;
}

/** Guided hub when the user has no personal weekly plan yet. */
export function HomeNoPlanHub({
  hasCommunityActivities = false,
  communityActivityCount = 0,
}: HomeNoPlanHubProps) {
  const router = useRouter();

  return (
    <section className="home-no-plan-hub space-y-4">
      <div className="section-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary-soft/60 via-surface to-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          Welcome to Happy First
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          {hasCommunityActivities
            ? 'Log community activities — or add a personal plan'
            : 'Explore the platform — no plan required to start'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {hasCommunityActivities
            ? `You have ${communityActivityCount} community ${communityActivityCount === 1 ? 'activity' : 'activities'} ready on Tasks. A personal weekly plan is optional but unlocks your own Body, Mind & Soul goals.`
            : 'You skipped creating a plan — that is fine. Browse communities, log when you join one, or create a personal plan whenever you are ready.'}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {hasCommunityActivities ? (
            <Button className="gap-2" onClick={() => router.push('/tasks')}>
              <ClipboardList className="h-4 w-4" />
              Go to Tasks
            </Button>
          ) : (
            <Button className="gap-2" variant="outline" onClick={() => router.push('/community')}>
              <Compass className="h-4 w-4" />
              Find a community
            </Button>
          )}
          <Button
            variant={hasCommunityActivities ? 'outline' : 'default'}
            className="gap-2"
            onClick={() => router.push('/create-plan')}
          >
            <CalendarDays className="h-4 w-4" />
            Create weekly plan
          </Button>
        </div>
      </div>

      <HomeMotivationCard />

      <div className="section-card p-4">
        <p className="text-sm font-semibold text-foreground">How Happy First works</p>
        <ul className="mt-3 space-y-3">
          {PLATFORM_STEPS.map((step) => (
            <li key={step.title} className="flex gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <step.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Tap <span className="font-semibold text-foreground">Tour</span> in the header anytime, or{' '}
          <Link href="/settings" className="font-semibold text-primary hover:underline">
            open Settings
          </Link>{' '}
          to pick your default landing page.
        </p>
      </div>
    </section>
  );
}
