'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  Target,
  TrendingUp,
  Coins,
  ChevronRight,
  Users,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import LoadingScreen from '@/components/ui/LoadingScreen';
import GuidedTour from '@/components/ui/GuidedTour';
import TourStartButton from '@/components/ui/TourStartButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useAuthStore } from '@/lib/store/authStore';
import { usePageTour } from '@/lib/hooks/usePageTour';
import { economyAPI, type XpDashboard, type LevelMember } from '@/lib/api/economy';
import { xpTourSteps } from '@/lib/utils/tourSteps';
import { cn } from '@/lib/utils';

const XP_STEPS = [
  {
    title: 'Log challenging activities',
    detail: 'XP reflects how demanding the lifestyle you’ve committed to is.',
  },
  {
    title: 'Hit your daily goal',
    detail: 'Steady days compound — consistency levels you up faster.',
  },
  {
    title: 'Climb the levels',
    detail: 'Tap any level to meet members at that standing.',
  },
];

/** Member-facing XP earn overview (intensity details stay internal). */
const XP_EARN_METHODS = [
  {
    label: 'Log plan activities',
    detail: 'Each logged unit contributes XP based on the activity’s difficulty.',
  },
  {
    label: 'Harder activities earn more',
    detail: 'Intense activities (e.g. Run, Gym) grant more XP per unit than lighter ones.',
  },
  {
    label: 'Daily XP goal',
    detail: 'Aim for about 10 XP per day to stay on a healthy level-up pace.',
  },
  {
    label: 'Consistency compounds',
    detail: 'Regular logging across the week moves you through Beginner → Happiness Legend.',
  },
];

function formatXpValue(value: number) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default function XpPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated, sessionReady } = useAuthStore();
  const [data, setData] = useState<XpDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [members, setMembers] = useState<LevelMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const { runTour, isMounted, handleStartTour, handleTourFinish } = usePageTour('tourCompleted:xp');

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !user) {
      router.push('/login');
      return;
    }
    void (async () => {
      try {
        const res = await economyAPI.xp();
        setData(res.data.data);
      } catch {
        setError('Could not load XP dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, user, isHydrated, sessionReady, router]);

  const openLevel = async (level: number) => {
    setSelectedLevel(level);
    setMembersLoading(true);
    try {
      const res = await economyAPI.levelMembers(level);
      setMembers(res.data.data.members);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const goalPct = data
    ? Math.min(100, Math.round((data.todayXp / Math.max(data.dailyGoal, 1)) * 100))
    : 0;

  const currentLevelXp = data?.levels.find((l) => l.current)?.totalXp ?? 0;
  const levelProgressPct =
    data?.nextLevel != null
      ? Math.min(
          100,
          Math.round(
            ((data.totalXp - currentLevelXp) /
              Math.max(data.nextLevel.totalXp - currentLevelXp, 1)) *
              100
          )
        )
      : 100;

  return (
    <MainLayout>
      {isMounted ? (
        <>
          <GuidedTour run={runTour} onFinish={handleTourFinish} steps={xpTourSteps} />
          <TourStartButton onClick={handleStartTour} />
        </>
      ) : null}
      <PageHeader
        title="Happy First XP"
        subtitle="How challenging is the lifestyle you’ve committed to?"
      />

      {loading ? (
        <LoadingScreen label="Loading XP…" fullScreen />
      ) : data ? (
        <div className="space-y-4">
          {/* Hero standing */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="xp-hero section-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary-soft via-surface to-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lifetime XP
                </p>
                <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-foreground">
                  {data.totalXp.toLocaleString()}
                </p>
                <p className="mt-1.5 text-sm font-medium text-foreground">
                  Level {data.level}
                  <span className="text-muted-foreground"> · {data.levelTitle}</span>
                </p>
              </div>
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-float)]">
                <Sparkles className="h-6 w-6" />
              </span>
            </div>

            {data.nextLevel ? (
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Next:{' '}
                    <span className="font-medium text-foreground">
                      {data.nextLevel.title}
                    </span>{' '}
                    ({data.nextLevel.totalXp.toLocaleString()} XP)
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {data.nextLevel.remaining.toLocaleString()} to go
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${levelProgressPct}%` }}
                  />
                </div>
                {data.prediction.estimatedDaysRemaining != null ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    ~{data.prediction.averageXpPerDay} XP/day avg · about{' '}
                    {data.prediction.estimatedDaysRemaining} days to next level
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  Daily XP goal
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {data.todayXp} / {data.dailyGoal}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-primary">{goalPct}% today</p>
            </div>

            <Link
              href="/coins"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              <Coins className="h-3.5 w-3.5" />
              View Happy First Coins →
            </Link>
          </motion.section>

          {goalPct >= 100 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex gap-2">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-snug text-foreground">
                  Daily goal crushed — keep logging to push toward{' '}
                  <span className="font-semibold text-primary">
                    {data.nextLevel?.title ?? 'the next milestone'}
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : null}

          {/* Levels — shown first so level-up path is clear */}
          <section aria-label="Levels" className="xp-levels-section">
            <h2 className="section-title mb-3">Levels</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              XP table — tap a level to see members at that standing
            </p>
            <ul className="section-card divide-y divide-border overflow-hidden">
              {data.levels.map((row) => (
                <li key={row.level}>
                  <button
                    type="button"
                    onClick={() => openLevel(row.level)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60',
                      row.current && 'bg-primary-soft/50',
                      selectedLevel === row.level && 'bg-primary-soft/70'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                        row.current
                          ? 'bg-primary text-primary-foreground'
                          : row.reached
                            ? 'bg-primary-soft text-primary'
                            : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      L{row.level}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {row.title}
                        {row.current ? (
                          <span className="ml-1.5 text-[11px] font-semibold text-primary">
                            You
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {row.totalXp.toLocaleString()} XP · ~{row.approxTime} ·{' '}
                        {row.memberCount} members
                      </span>
                    </span>
                    {row.reached ? (
                      <span className="text-[11px] font-semibold text-success">Reached</span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selectedLevel != null ? (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              aria-label={`Level ${selectedLevel} members`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="section-title flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Level {selectedLevel} members
                </h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setSelectedLevel(null)}
                >
                  Close
                </button>
              </div>
              {membersLoading ? (
                <LoadingScreen label="Loading members…" size={64} className="py-8" />
              ) : members.length === 0 ? (
                <div className="section-card px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No members at this level yet.
                  </p>
                </div>
              ) : (
                <ul className="section-card divide-y divide-border overflow-hidden">
                  {members.map((m) => (
                    <li key={m.profileId}>
                      <Link
                        href={`/feed/profile/${m.profileId}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
                      >
                        <ProfileAvatar
                          name={m.name}
                          avatarUrl={m.avatarUrl}
                          avatarSeed={m.avatarSeed}
                          avatarStyle={m.avatarStyle}
                          size="md"
                          rounded="xl"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {m.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {m.levelTitle}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
                          {m.totalXp.toLocaleString()} XP
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          ) : null}

          {/* Personal bests */}
          <section aria-label="Personal bests">
            <h2 className="section-title mb-3">Personal bests</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Best day"
                value={formatXpValue(data.personalBest.day)}
                icon={Trophy}
                accent="orange"
              />
              <StatCard
                label="Best week"
                value={formatXpValue(data.personalBest.week)}
                icon={TrendingUp}
                accent="orange"
              />
              <StatCard
                label="Best month"
                value={formatXpValue(data.personalBest.month)}
                icon={Sparkles}
                accent="neutral"
              />
            </div>
          </section>

          {/* XP sources */}
          <section aria-label="XP sources" className="xp-sources-section">
            <h2 className="section-title mb-3">XP sources</h2>
            <p className="mb-3 text-xs text-muted-foreground">Lifetime by activity</p>
            {data.sources.length === 0 ? (
              <div className="section-card px-4 py-10 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Sparkles className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-foreground">No XP yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Log activities to start earning XP.
                </p>
              </div>
            ) : (
              <ul className="section-card divide-y divide-border overflow-hidden">
                {data.sources.map((row) => {
                  const maxXp = Math.max(...data.sources.map((s) => s.xp), 1);
                  const pct = Math.round((row.xp / maxXp) * 100);
                  return (
                    <li key={row.activity} className="px-4 py-3">
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-foreground">
                          {row.activity}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-primary">
                          {row.xp} XP
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="How XP works">
            <h2 className="section-title mb-3">How it works</h2>
            <ol className="section-card divide-y divide-border">
              {XP_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="Ways to earn XP">
            <h2 className="section-title mb-3">Ways to earn XP</h2>
            <ul className="section-card divide-y divide-border">
              {XP_EARN_METHODS.map((row) => (
                <li key={row.label} className="px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{row.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{row.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="section-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{error || 'No data'}</p>
        </div>
      )}
    </MainLayout>
  );
}
