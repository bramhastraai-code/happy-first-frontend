'use client';

import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Copy, Mail, MessageCircle, Share2, Check, Link2 } from 'lucide-react';
import { authAPI } from '@/lib/api/auth';
import { useEffect, useState } from 'react';
import type { UpdateProfileData } from '@/lib/api/auth';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';
import { cn } from '@/lib/utils';

const SHARE_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'mail', label: 'Email', icon: Mail },
  { id: 'facebook', label: 'Facebook', icon: Share2 },
  { id: 'copy', label: 'Copy', icon: Copy },
] as const;

const STEPS = [
  {
    title: 'Share your link',
    detail: 'Send your code or link to someone who wants to join.',
  },
  {
    title: 'They register',
    detail: 'They sign up on Happy First Club using your referral link.',
  },
  {
    title: 'You earn points',
    detail: 'Bonus Happy Points are added when they get started.',
  },
];

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    referredUsers: UpdateProfileData[];
    HappyPoints: number;
  }>({ totalReferrals: 0, referredUsers: [], HappyPoints: 0 });

  useEffect(() => {
    Promise.all([authAPI.userInfo(), authAPI.referralStats()])
      .then(([userRes, statsRes]) => {
        setReferralCode(userRes.data.data.referralCode ?? '');
        setReferralStats(statsRes.data.data);
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

    const text = encodeURIComponent(
      `Join me on Happy First Club — building wellness habits together! ${referralLink}`
    );

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${text}`);
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
        );
        break;
      case 'mail':
        window.open(`mailto:?subject=Join Happy First Club&body=${text}`);
        break;
      case 'copy':
        handleCopyLink();
        break;
      default:
        break;
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Refer friends"
        subtitle="Share your link and track referral points"
      />

      <div className="space-y-4">
        <div className="section-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Your referral code</h2>
          </div>

          <p className="font-mono text-2xl font-bold tracking-wide text-foreground">
            {loading ? '…' : referralCode || '—'}
          </p>

          <div className="mt-3 rounded-xl border border-border bg-secondary px-3 py-2.5">
            <p className="break-all text-xs text-muted-foreground">
              {loading ? 'Loading link…' : referralLink || 'Link unavailable'}
            </p>
          </div>

          <Button onClick={handleCopyLink} disabled={!referralLink} className="mt-3 w-full">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
        </div>

        <div className="app-card p-4">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="pr-4">
              <p className="text-xs font-medium text-muted-foreground">Referrals</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {loading ? '—' : referralStats.totalReferrals}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Friends joined</p>
            </div>
            <div className="pl-4">
              <p className="text-xs font-medium text-muted-foreground">Happy Points</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {loading ? '—' : referralStats.HappyPoints.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">From referrals</p>
            </div>
          </div>
        </div>

        <section aria-label="Share options">
          <h2 className="section-title mb-3">Share via</h2>
          <div className="section-card grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
            {SHARE_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleShare(id)}
                disabled={!referralLink}
                className={cn(
                  'flex flex-col items-center gap-1.5 px--2 py-3.5 text-center sm:px-2',
                  'border-border sm:border-l sm:first:border-l-0',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <Icon className="h-5 w-5 text-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="How referrals work">
          <h2 className="section-title mb-3">How it works</h2>
          <ol className="section-card divide-y divide-border">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
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

        {!loading && referralStats.referredUsers.length > 0 && (
          <section aria-label="Referred friends">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Referred friends</h2>
              <span className="text-xs text-muted-foreground">
                {referralStats.referredUsers.length} total
              </span>
            </div>
            <ul className="section-card divide-y divide-border">
              {referralStats.referredUsers.map((user, index) => (
                <li
                  key={`${user.email ?? user.name ?? 'user'}-${index}`}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                    {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name ?? 'New member'}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && referralStats.totalReferrals === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No referrals yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your link to start earning referral points.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
