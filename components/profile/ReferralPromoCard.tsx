'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { authAPI, type ReferralStatsData } from '@/lib/api/auth';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronRight,
  Coins,
  Copy,
  Mail,
  MessageCircle,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';

const SHARE_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'mail', label: 'Email', icon: Mail },
  { id: 'copy', label: 'Copy', icon: Copy },
] as const;

const EMPTY_STATS: ReferralStatsData = {
  totalReferrals: 0,
  referredUsers: [],
  HappyPoints: 0,
  happyCoinsEarned: 0,
  activityImpact: [],
};

interface ReferralPromoCardProps {
  className?: string;
  compact?: boolean;
}

export default function ReferralPromoCard({ className, compact = false }: ReferralPromoCardProps) {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState<ReferralStatsData>(EMPTY_STATS);

  useEffect(() => {
    Promise.all([authAPI.userInfo(), authAPI.referralStats()])
      .then(([userRes, statsRes]) => {
        setReferralCode(userRes.data.data.referralCode ?? '');
        setReferralStats(statsRes.data.data ?? EMPTY_STATS);
      })
      .catch((error) => {
        console.error('Error fetching referral data:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  const referralLink = referralCode ? `${getSiteUrl()}/register?ref=${referralCode}` : '';

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    if (!referralLink) return;
    const text = encodeURIComponent(`Join me on ${BRAND_NAME}! ${referralLink}`);
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${text}`);
        break;
      case 'mail':
        window.open(`mailto:?subject=Join ${BRAND_NAME}&body=${text}`);
        break;
      case 'copy':
        void handleCopyLink();
        break;
      default:
        break;
    }
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft/70 via-surface to-surface shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="border-b border-primary/15 px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Refer & earn
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-foreground">
              Invite friends to Happy First
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your code — earn Happy Points and coins when friends join and stay active.
            </p>
          </div>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Share2 className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {!compact ? (
          <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
            {(
              [
                { label: 'Friends', value: loading ? '—' : String(referralStats.totalReferrals), icon: Users },
                { label: 'Referral points', value: loading ? '—' : (referralStats.HappyPoints || 0).toLocaleString(), icon: Sparkles },
                {
                  label: 'Coins',
                  value: loading ? '—' : (referralStats.happyCoinsEarned || 0).toLocaleString(),
                  icon: Coins,
                },
              ] as const
            ).map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center px-2 py-3 text-center">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-1.5 text-lg font-bold tabular-nums text-foreground">{value}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your referral code
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-foreground sm:text-3xl">
            {loading ? '…' : referralCode || '—'}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void handleCopyLink()}
          disabled={!referralLink}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied invite link
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy invite link
            </>
          )}
        </Button>

        <div className="grid grid-cols-3 gap-2">
          {SHARE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleShare(id)}
              disabled={!referralLink}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border border-border px-1 py-2.5',
                'transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <Icon className="h-5 w-5 text-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>

        {!loading && referralStats.insight?.message ? (
          <p className="rounded-xl border border-primary/15 bg-primary-soft/40 px-3 py-2.5 text-xs text-foreground">
            {referralStats.insight.message}
          </p>
        ) : null}

        <Link
          href="/referral"
          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          View referral stats & friends
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </section>
  );
}
