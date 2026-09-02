'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authAPI, type ReferralStatsData } from '@/lib/api/auth';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, Copy, Mail, MessageCircle } from 'lucide-react';

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
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(`Join me on ${BRAND_NAME}! ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleEmail = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(`Join me on ${BRAND_NAME}! ${referralLink}`);
    window.open(`mailto:?subject=Join ${BRAND_NAME}&body=${text}`);
  };

  return (
    <section className={cn('overflow-hidden rounded-2xl border border-border bg-surface', className)}>
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <h2 className="text-base font-semibold text-foreground">Invite friends</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          They join with your code. You earn coins.
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {!compact ? (
          <p className="text-xs text-muted-foreground">
            {loading
              ? '…'
              : `${referralStats.totalReferrals} friends · ${(referralStats.happyCoinsEarned || 0).toLocaleString()} coins`}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleCopyLink()}
          disabled={!referralLink}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-[#fafafa] px-3 py-3 text-left disabled:opacity-50"
        >
          <span className="font-mono text-lg font-bold tracking-[0.18em] text-foreground">
            {loading ? '…' : referralCode || '—'}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={!referralLink}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={handleEmail}
            disabled={!referralLink}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
        </div>

        <Link
          href="/referral"
          className="flex items-center justify-between py-1 text-sm font-semibold text-foreground"
        >
          View stats
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </section>
  );
}
