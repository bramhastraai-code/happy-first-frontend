'use client';

import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Mail,
  MessageCircle,
  Check,
  Users,
  Coins,
  Sparkles,
} from 'lucide-react';
import { authAPI, type ReferralStatsData, type ReferredMember } from '@/lib/api/auth';
import { useEffect, useMemo, useState } from 'react';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import { cn } from '@/lib/utils';

type MemberSort = 'newest' | 'oldest' | 'nameAsc';

const ACTIVITY_CATEGORIES = [
  { id: 'body', label: 'Body', emoji: '💪' },
  { id: 'mind', label: 'Mind', emoji: '🧠' },
  { id: 'soul', label: 'Soul', emoji: '✨' },
] as const;

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

function formatPercent(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
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
    copy.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
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

  const activityGroups = useMemo(() => {
    const rows = referralStats.activityImpact ?? [];
    const grouped: Array<{
      id: string;
      label: string;
      emoji: string;
      items: typeof rows;
    }> = ACTIVITY_CATEGORIES.map((category) => ({
      ...category,
      items: rows
        .filter((row) => (row.category || 'body').toLowerCase() === category.id)
        .sort((a, b) => b.total - a.total),
    })).filter((group) => group.items.length > 0);

    const known = new Set(ACTIVITY_CATEGORIES.map((c) => c.id));
    const other = rows.filter((row) => {
      const cat = (row.category || 'body').toLowerCase();
      return !known.has(cat as (typeof ACTIVITY_CATEGORIES)[number]['id']);
    });
    if (other.length > 0) {
      grouped.push({ id: 'other', label: 'Other', emoji: '✨', items: other });
    }
    return grouped;
  }, [referralStats.activityImpact]);

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    if (!referralLink) return;

    const text = encodeURIComponent(
      `Join me on ${BRAND_NAME}! ${referralLink}`
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
      `Hi ${member.name || 'there'}! Come back to ${BRAND_NAME} and keep your streak going.`
    );
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const platform = referralStats.platformImpact;
  const impactRows = [
    { label: 'Members', value: platform?.membersPercent ?? 0 },
    { label: 'XP', value: platform?.xpPercent ?? 0 },
    { label: 'Coins', value: platform?.coinsPercent ?? 0 },
    { label: 'Posts', value: platform?.feedPostsPercent ?? 0 },
    { label: 'Activities', value: platform?.activitiesPercent ?? 0 },
  ].filter((row) => row.value > 0);

  return (
    <MainLayout>
      <PageHeader title="Refer friends" subtitle="Invite people and earn rewards" />

      <div className="space-y-5">
        {/* Stats */}
        <div className="section-card overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border">
            {(
              [
                {
                  label: 'Friends',
                  value: loading ? '—' : String(referralStats.totalReferrals),
                  icon: Users,
                },
                {
                  label: 'Referral points',
                  value: loading
                    ? '—'
                    : (referralStats.HappyPoints || 0).toLocaleString(),
                  icon: Sparkles,
                },
                {
                  label: 'Coins',
                  value: loading
                    ? '—'
                    : (referralStats.happyCoinsEarned || 0).toLocaleString(),
                  icon: Coins,
                },
              ] as const
            ).map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center px-2 py-4 text-center">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {value}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Share */}
        <section className="section-card p-4">
          <h2 className="text-base font-semibold text-foreground">Your code</h2>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            disabled={!referralLink}
            className="mt-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-[#fafafa] px-3 py-3 text-left disabled:opacity-50"
          >
            <span className="font-mono text-xl font-bold tracking-[0.18em] text-foreground">
              {loading ? '…' : referralCode || '—'}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </span>
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleShare('whatsapp')}
              disabled={!referralLink}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleShare('mail')}
              disabled={!referralLink}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
          </div>
        </section>

        {!loading && impactRows.length > 0 ? (
          <section>
            <h2 className="section-title mb-3">You are the reason for…</h2>
            <ul className="section-card space-y-3 p-4">
              {impactRows.map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums text-primary">
                      {formatPercent(row.value)}%
                    </span>
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
          </section>
        ) : null}

        {!loading && activityGroups.length > 0 ? (
          <section>
            <h2 className="section-title mb-3">Overall Referral Activity</h2>
            <div className="space-y-3">
              {activityGroups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.emoji} {group.label}
                  </p>
                  <ul className="section-card divide-y divide-border">
                    {group.items.map((row) => (
                      <li
                        key={row.activityId}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatActivityTotal(row.total, row.unit)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Friends */}
        {!loading && sortedMembers.length > 0 ? (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">Friends</h2>
              <CustomDropdown
                variant="pill"
                align="right"
                value={sort}
                aria-label="Sort friends"
                onChange={(value) => setSort(value as MemberSort)}
                options={[
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'nameAsc', label: 'A–Z' },
                ]}
              />
            </div>
            <ul className="section-card divide-y divide-border">
              {sortedMembers.map((user) => (
                <li
                  key={user._id}
                  className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                      {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
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
                      Remind
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && referralStats.totalReferrals === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No friends yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your link to get started.
            </p>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
