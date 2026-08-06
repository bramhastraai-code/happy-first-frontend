'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coins, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/authStore';
import {
  economyAPI,
  type CoinDashboard,
  type RedeemCatalogItem,
} from '@/lib/api/economy';

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

export default function CoinsPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [data, setData] = useState<CoinDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
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
  }, [accessToken, user, isHydrated, router]);

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
      <AppPageHeader
        title="Happy First Coins"
        subtitle="Engagement currency — earn by logging, inviting, and connecting"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : data ? (
        <div className="mt-4 space-y-5">
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <section className="section-card p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Coins className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Balance
                </p>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {data.balance.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Earned {data.earned.toLocaleString()} till date
              {data.platformSharePercent > 0
                ? ` — you are ${data.platformSharePercent}% of happy coins on the platform`
                : ''}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Redeemed</p>
                <p className="text-lg font-semibold tabular-nums">{data.redeemed.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-lg font-semibold tabular-nums">{data.balance.toLocaleString()}</p>
              </div>
            </div>
            <Link href="/xp" className="mt-4 inline-block text-sm font-medium text-primary">
              View XP standing →
            </Link>
          </section>

          <section className="section-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Redeem</h2>
            </div>
            <ul className="divide-y divide-border">
              {data.catalog.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.available && item.cost
                        ? `${item.cost.toLocaleString()} coins`
                        : 'Coming soon'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !item.available ||
                      !item.cost ||
                      data.balance < item.cost ||
                      redeeming === item.id
                    }
                    onClick={() => handleRedeem(item)}
                  >
                    {redeeming === item.id ? '…' : 'Redeem'}
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="section-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Coin history</h2>
            </div>
            {data.history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No coin activity yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.history.map((row) => {
                  const credit = row.direction === 'credit';
                  return (
                    <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={
                          credit
                            ? 'mt-0.5 text-emerald-600'
                            : 'mt-0.5 text-rose-600'
                        }
                      >
                        {credit ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {REASON_LABELS[row.reason] || row.reason}
                          {row.meta && typeof row.meta === 'object' && 'title' in row.meta
                            ? ` — ${String((row.meta as { title?: string }).title)}`
                            : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.reference ? `${row.reference} · ` : ''}
                          {new Date(row.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          credit ? 'text-emerald-700' : 'text-rose-700'
                        }`}
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
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{error || 'No data'}</p>
      )}
    </MainLayout>
  );
}
