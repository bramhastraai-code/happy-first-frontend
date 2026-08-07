'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  BookOpen,
  Coffee,
  BottleWine,
  Shirt,
  Scale,
  ShoppingBag,
  Ticket,
  Users,
  Sparkles,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/authStore';
import {
  economyAPI,
  type CoinDashboard,
  type RedeemCatalogItem,
} from '@/lib/api/economy';
import { cn } from '@/lib/utils';

const REASON_LABELS: Record<string, string> = {
  daily_log: 'Daily log',
  late_log: 'Late log (50%)',
  late_penalty: 'Missed day penalty',
  weekly_streak: '7-day streak bonus',
  community_90: 'Community 90% bonus',
  referral: 'Referral bonus',
  engagement_received: 'Post likes / comments',
  gift_reaction: 'Gift reaction',
  profile_completion: 'Profile 100% complete',
  profile_quarterly_update: 'Quarterly profile update',
  redeem: 'Redeemed',
};

const EARN_STEPS = [
  {
    title: 'Log your day',
    detail: 'Earn coins when you complete daily activities on time.',
  },
  {
    title: 'Stay consistent',
    detail: 'Streaks, community goals, and referrals unlock bonus coins.',
  },
  {
    title: 'Redeem rewards',
    detail: 'Spend coins on merch, unlocks, and upcoming expert sessions.',
  },
];

function catalogIcon(item: RedeemCatalogItem) {
  const id = item.id;
  if (id.includes('journal') || id.includes('book')) return BookOpen;
  if (id.includes('mug') || id.includes('coffee')) return Coffee;
  if (id.includes('bottle')) return BottleWine;
  if (id.includes('shirt') || id.includes('t-shirt')) return Shirt;
  if (id.includes('scale') || id.includes('weigh')) return Scale;
  if (id.includes('voucher') || id.includes('amazon')) return Ticket;
  if (id.includes('bag') || id.includes('mat')) return ShoppingBag;
  if (item.kind === 'unlock') return Lock;
  if (item.kind === 'coming_soon') return Sparkles;
  return Gift;
}

export default function CoinsPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated, sessionReady } = useAuthStore();
  const [data, setData] = useState<CoinDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !user) {
      router.push('/login');
      return;
    }
    void (async () => {
      try {
        const res = await economyAPI.coins();
        setData(res.data.data);
      } catch {
        setError('Could not load coin dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, user, isHydrated, sessionReady, router]);

  const handleRedeem = async (item: RedeemCatalogItem) => {
    if (!item.available || !item.cost) return;
    setRedeeming(item.id);
    setMessage('');
    setError('');
    try {
      await economyAPI.redeem(item.id);
      const res = await economyAPI.coins();
      setData(res.data.data);
      setMessage(`Redeemed: ${item.title}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Redeem failed';
      setError(msg);
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Happy First Coins"
        subtitle="Earn by logging, inviting, and connecting"
      />

      {loading ? (
        <LoadingScreen label="Loading coins…" fullScreen />
      ) : data ? (
        <div className="space-y-4">
          {message ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {message}
            </motion.p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {/* Hero balance */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="section-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary-soft via-surface to-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Available balance
                </p>
                <p className="mt-1 flex items-baseline gap-1.5 text-4xl font-bold tabular-nums tracking-tight text-foreground">
                  {data.balance.toLocaleString()}
                  <span className="text-base font-semibold text-primary">coins</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Earned {data.earned.toLocaleString()} till date
                  {data.platformSharePercent > 0
                    ? ` · you are ${data.platformSharePercent}% of happy coins on the platform`
                    : ''}
                </p>
              </div>
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-float)]">
                <Coins className="h-6 w-6" />
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/80 bg-surface/80 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Redeemed
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                  {data.redeemed.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-surface/80 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Lifetime earned
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                  {data.earned.toLocaleString()}
                </p>
              </div>
            </div>

            <Link
              href="/xp"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              <Sparkles className="h-3.5 w-3.5" />
              View XP standing →
            </Link>
          </motion.section>

          {data.platformSharePercent > 0 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-snug text-foreground">
                  Your coins make up{' '}
                  <span className="font-semibold text-primary">
                    {data.platformSharePercent}%
                  </span>{' '}
                  of all Happy First coins earned on the platform.
                </p>
              </div>
            </div>
          ) : null}

          {/* Redeem catalog */}
          <section aria-label="Redeem rewards">
            <h2 className="section-title mb-3">Redeem</h2>
            <ul className="section-card divide-y divide-border overflow-hidden">
              {data.catalog.map((item) => {
                const Icon = catalogIcon(item);
                const canRedeem =
                  item.available &&
                  !!item.cost &&
                  data.balance >= item.cost &&
                  redeeming !== item.id;
                const shortfall =
                  item.available && item.cost && data.balance < item.cost
                    ? item.cost - data.balance
                    : 0;

                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        item.available
                          ? 'bg-primary-soft text-primary'
                          : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.available && item.cost
                          ? `${item.cost.toLocaleString()} coins`
                          : 'Coming soon'}
                        {shortfall > 0
                          ? ` · need ${shortfall.toLocaleString()} more`
                          : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={canRedeem ? 'default' : 'outline'}
                      disabled={
                        !item.available ||
                        !item.cost ||
                        data.balance < item.cost ||
                        redeeming === item.id
                      }
                      onClick={() => handleRedeem(item)}
                      className="shrink-0 rounded-full"
                    >
                      {redeeming === item.id
                        ? '…'
                        : !item.available
                          ? 'Soon'
                          : 'Redeem'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* History */}
          <section aria-label="Coin history">
            <h2 className="section-title mb-3">Coin history</h2>
            {data.history.length === 0 ? (
              <div className="section-card px-4 py-10 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Coins className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-foreground">No coin activity yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Log activities and invite friends to start earning.
                </p>
              </div>
            ) : (
              <ul className="section-card divide-y divide-border overflow-hidden">
                {data.history.map((row) => {
                  const credit = row.direction === 'credit';
                  return (
                    <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                          credit
                            ? 'bg-success-soft text-success'
                            : 'bg-red-50 text-destructive'
                        )}
                      >
                        {credit ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {REASON_LABELS[row.reason] || row.reason}
                          {row.meta &&
                          typeof row.meta === 'object' &&
                          'title' in row.meta
                            ? ` — ${String((row.meta as { title?: string }).title)}`
                            : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.reference ? `${row.reference} · ` : ''}
                          {new Date(row.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'shrink-0 text-sm font-bold tabular-nums',
                          credit ? 'text-success' : 'text-destructive'
                        )}
                      >
                        {credit ? '+' : '−'}
                        {row.amount}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="How coins work">
            <h2 className="section-title mb-3">How it works</h2>
            <ol className="section-card divide-y divide-border">
              {EARN_STEPS.map((step, index) => (
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
        </div>
      ) : (
        <div className="section-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{error || 'No data'}</p>
        </div>
      )}
    </MainLayout>
  );
}
