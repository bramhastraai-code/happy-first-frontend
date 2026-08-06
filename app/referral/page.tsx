'use client';

import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Mail,
  MessageCircle,
  Share2,
  Check,
  Link2,
  Sparkles,
  Users,
  Coins,
} from 'lucide-react';
import { authAPI, type ReferralStatsData, type ReferredMember } from '@/lib/api/auth';
import { useEffect, useMemo, useState } from 'react';
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
    title: 'You earn rewards',
    detail: 'Happy Points and Happy Coins are added when they get started.',
  },
];

type MemberSort = 'newest' | 'oldest' | 'nameAsc';

function formatJoinedDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatActivityTotal(total: number, unit: string): string {
  const rounded =
    total >= 1000 ? Math.round(total).toLocaleString() : String(Math.round(total * 10) / 10);
  return unit ? `${rounded} ${unit}` : rounded;
}

function whatsAppDigits(countryCode?: string | null, phone?: string | null): string | null {
  if (!phone) return null;
  const cc = String(countryCode || '+91').replace(/\D/g, '');
  const local = String(phone).replace(/\D/g, '');
  if (!local) return null;
  return `${cc}${local}`;
}

function sortMembers(members: ReferredMember[], sort: MemberSort): ReferredMember[] {
  const copy = [...members];
  if (sort === 'nameAsc') {
    copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    return copy;
  }
  copy.sort((a, b) => {
    const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    return sort === 'newest' ? tb - ta : ta - tb;
  });
  return copy;
}

const EMPTY_STATS: ReferralStatsData = {
  totalReferrals: 0,
  referredUsers: [],
  HappyPoints: 0,
  happyCoinsEarned: 0,
  activityImpact: [],
};

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<MemberSort>('newest');
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

  const sortedMembers = useMemo(
    () => sortMembers(referralStats.referredUsers || [], sort),
    [referralStats.referredUsers, sort]
  );

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    if (!referralLink) return;

    const text = encodeURIComponent(
      `Join me on ${BRAND_NAME} — building wellness habits together! ${referralLink}`
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
        window.open(`mailto:?subject=Join ${BRAND_NAME}&body=${text}`);
        break;
      case 'copy':
        void handleCopyLink();
        break;
      default:
        break;
    }
  };

  const sendWhatsAppReminder = (member: ReferredMember) => {
    const digits = whatsAppDigits(member.countryCode, member.phoneNumber);
    if (!digits) return;
    const text = encodeURIComponent(
      `Hi ${member.name || 'there'}! Missing you on ${BRAND_NAME} — come back and log your activities to keep your streak alive. You've got this!`
    );
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const platform = referralStats.platformImpact;
  const impactRows = [
    { label: 'Members', value: platform?.membersPercent ?? 0 },
    { label: 'XP Points', value: platform?.xpPercent ?? 0 },
    { label: 'Happy Coins', value: platform?.coinsPercent ?? 0 },
    { label: 'Feed Posts', value: platform?.feedPostsPercent ?? 0 },
    { label: 'Total Activities', value: platform?.activitiesPercent ?? 0 },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Refer friends"
        subtitle="Share your link and track your impact"
      />

      <div className="space-y-4">
        {/* Stats first */}
        <div className="app-card p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
            <div className="sm:pr-4">
              <p className="text-xs font-medium text-muted-foreground">Total referrals</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums text-foreground">
                <Users className="h-5 w-5 text-primary" />
                {loading ? '—' : referralStats.totalReferrals}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Friends joined</p>
            </div>
            <div className="sm:px-4">
              <p className="text-xs font-medium text-muted-foreground">Happy Points</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {loading ? '—' : (referralStats.HappyPoints || 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">From referrals</p>
            </div>
            <div className="col-span-2 sm:col-span-1 sm:pl-4">
              <p className="text-xs font-medium text-muted-foreground">Happy Coins earned</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums text-foreground">
                <Coins className="h-5 w-5 text-primary" />
                {loading ? '—' : (referralStats.happyCoinsEarned || 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Referral bonuses</p>
            </div>
          </div>
        </div>

        {/* Motivational insight */}
        {!loading && referralStats.insight?.message ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-snug text-foreground">{referralStats.insight.message}</p>
            </div>
          </div>
        ) : null}

        {/* Code + share grouped */}
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

          <Button onClick={() => void handleCopyLink()} disabled={!referralLink} className="mt-3 w-full">
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

          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Share via
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHARE_OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleShare(id)}
                  disabled={!referralLink}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 text-center',
                    'transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  <Icon className="h-5 w-5 text-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platform impact */}
        {!loading && (referralStats.totalReferrals > 0 || (platform && platform.membersPercent > 0)) ? (
          <section aria-label="Platform impact">
            <h2 className="section-title mb-3">Your platform impact</h2>
            <div className="section-card space-y-3 p-4">
              <p className="text-xs text-muted-foreground">
                You are the reason for these shares of Happy First activity — based on everyone who joined with your code.
              </p>
              <ul className="space-y-2.5">
                {impactRows.map((row) => (
                  <li key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-foreground">{row.label}</span>
                      <span className="font-semibold tabular-nums text-primary">{row.value}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Your Impact — activity totals */}
        {!loading && (referralStats.activityImpact?.length ?? 0) > 0 ? (
          <section aria-label="Your impact">
            <h2 className="section-title mb-3">Your impact</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Lifetime totals from everyone you referred, across all tracked activities.
            </p>
            <ul className="section-card divide-y divide-border">
              {referralStats.activityImpact!.map((row) => (
                <li
                  key={row.activityId}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.logCount.toLocaleString()} log{row.logCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatActivityTotal(row.total, row.unit)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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

        {!loading && sortedMembers.length > 0 && (
          <section aria-label="Referred friends">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">Referred friends</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{sortedMembers.length} total</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as MemberSort)}
                  className="h-9 rounded-xl border border-input bg-surface px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Sort referred friends"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="nameAsc">Alphabetical</option>
                </select>
              </div>
            </div>
            <ul className="section-card divide-y divide-border">
              {sortedMembers.map((user) => (
                <li
                  key={user._id}
                  className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                      {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {user.name ?? 'New member'}
                        </p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            user.status === 'active'
                              ? 'bg-success/15 text-success'
                              : 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatJoinedDate(user.joinedAt || user.createdAt)}
                      </p>
                    </div>
                  </div>
                  {user.status === 'inactive' && user.canWhatsAppRemind ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => sendWhatsAppReminder(user)}
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      WhatsApp reminder
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Active means they logged an activity in the last{' '}
              {referralStats.activeWindowDays ?? 14} days.
            </p>
          </section>
        )}

        {!loading && referralStats.totalReferrals === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No referrals yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your link to start earning referral rewards and building your impact.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
