'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Sparkles, Trophy } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { useAuthStore } from '@/lib/store/authStore';
import { economyAPI, type XpDashboard, type LevelMember } from '@/lib/api/economy';

export default function XpPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [data, setData] = useState<XpDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [members, setMembers] = useState<LevelMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
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
  }, [accessToken, user, isHydrated, router]);

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

  return (
    <MainLayout>
      <AppPageHeader
        title="Happy First XP"
        subtitle="How challenging is the lifestyle you’ve committed to?"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : data ? (
        <div className="mt-4 space-y-5">
          <section className="section-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lifetime XP
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{data.totalXp.toLocaleString()}</p>
                <p className="mt-1 text-sm text-foreground">
                  Level {data.level} · {data.levelTitle}
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Sparkles className="h-6 w-6" />
              </span>
            </div>

            {data.nextLevel ? (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    Next: {data.nextLevel.title} ({data.nextLevel.totalXp.toLocaleString()} XP)
                  </span>
                  <span>{data.nextLevel.remaining.toLocaleString()} to go</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((data.totalXp - (data.levels.find((l) => l.current)?.totalXp || 0)) /
                            Math.max(
                              data.nextLevel.totalXp -
                                (data.levels.find((l) => l.current)?.totalXp || 0),
                              1
                            )) *
                            100
                        )
                      )}%`,
                    }}
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
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-foreground">Daily XP goal</span>
                <span className="tabular-nums text-muted-foreground">
                  {data.todayXp} / {data.dailyGoal}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>

            <Link href="/coins" className="mt-4 inline-block text-sm font-medium text-primary">
              View Happy First Coins →
            </Link>
          </section>

          <section className="section-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-600" /> Personal bests
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['Day', data.personalBest.day],
                  ['Week', data.personalBest.week],
                  ['Month', data.personalBest.month],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/50 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-base font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">XP sources</h2>
              <p className="text-xs text-muted-foreground">Lifetime by activity</p>
            </div>
            {data.sources.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Log activities to start earning XP.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.sources.map((row) => (
                  <li key={row.activity} className="flex justify-between px-4 py-2.5 text-sm">
                    <span>{row.activity}</span>
                    <span className="font-semibold tabular-nums">{row.xp} XP</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Levels</h2>
              <p className="text-xs text-muted-foreground">
                Tap a level to see members (follow / chat from their profile)
              </p>
            </div>
            <ul className="divide-y divide-border">
              {data.levels.map((row) => (
                <li key={row.level}>
                  <button
                    type="button"
                    onClick={() => openLevel(row.level)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40 ${
                      row.current ? 'bg-primary-soft/40' : ''
                    }`}
                  >
                    <span className="w-8 shrink-0 text-xs font-bold text-muted-foreground">
                      L{row.level}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{row.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.totalXp.toLocaleString()} XP · ~{row.approxTime} ·{' '}
                        {row.memberCount} members
                      </span>
                    </span>
                    {row.reached ? (
                      <span className="text-[11px] font-semibold text-emerald-700">Reached</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selectedLevel != null ? (
            <section className="section-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">Level {selectedLevel} members</h2>
                <button
                  type="button"
                  className="text-xs text-muted-foreground"
                  onClick={() => setSelectedLevel(null)}
                >
                  Close
                </button>
              </div>
              {membersLoading ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
              ) : members.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No members at this level yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {members.map((m) => (
                    <li key={m.profileId}>
                      <Link
                        href={`/feed/profile/${m.profileId}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
                      >
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {m.totalXp.toLocaleString()} XP
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{error || 'No data'}</p>
      )}
    </MainLayout>
  );
}
