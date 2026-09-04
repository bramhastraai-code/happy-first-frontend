'use client';

import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Copy,
  Mail,
  MessageCircle,
  Check,
  Instagram,
  Facebook,
  Share2,
} from 'lucide-react';
import { authAPI, type ReferralStatsData, type ReferredMember } from '@/lib/api/auth';
import { useEffect, useMemo, useState } from 'react';
import { BRAND_NAME } from '@/lib/brand';
import {
  copyReferralLink,
  nativeShareReferral,
  referralInviteUrl,
  shareReferralEmail,
  shareReferralFacebook,
  shareReferralInstagram,
  shareReferralWhatsApp,
} from '@/lib/utils/referralShare';
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

  const referralLink = referralCode ? referralInviteUrl(referralCode) : '';

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
    await copyReferralLink(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (platform: string) => {
    if (!referralLink) return;

    switch (platform) {
      case 'whatsapp':
        shareReferralWhatsApp(referralLink);
        break;
      case 'instagram':
        await shareReferralInstagram(referralLink);
        break;
      case 'facebook':
        shareReferralFacebook(referralLink);
        break;
      case 'mail':
        shareReferralEmail(referralLink);
        break;
      case 'more':
        {
          const shared = await nativeShareReferral(referralLink);
          if (!shared) await handleCopyLink();
        }
        break;
      case 'copy':
        await handleCopyLink();
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

      <div className="space-y-8">
        <div className="grid grid-cols-3">
          {(
            [
              {
                label: 'Friends',
                value: loading ? '—' : String(referralStats.totalReferrals),
              },
              {
                label: 'Points',
                value: loading ? '—' : (referralStats.HappyPoints || 0).toLocaleString(),
              },
              {
                label: 'Coins',
                value: loading
                  ? '—'
                  : (referralStats.happyCoinsEarned || 0).toLocaleString(),
              },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your code
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-foreground">
                {loading ? '…' : referralCode || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              disabled={!referralLink}
              className="inline-flex items-center gap-1 pb-1 text-sm font-semibold text-primary disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <span aria-hidden className="mt-3 block h-px bg-border" />

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Share
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(
              [
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
                { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
                { id: 'mail', label: 'Email', icon: Mail, color: '#EA580C' },
                { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
              ] as const
            ).map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => void handleShare(id)}
                disabled={!referralLink}
                className="flex flex-col items-center gap-1.5 disabled:opacity-50"
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-[11px] font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleShare('more')}
            disabled={!referralLink}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            More ways to share
          </button>
        </section>

        {!loading && impactRows.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-foreground">You are the reason for…</h2>
            <ul className="mt-3 space-y-3">
              {impactRows.map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums text-primary">
                      {formatPercent(row.value)}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
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
            <h2 className="text-sm font-semibold text-foreground">Referral activity</h2>
            <div className="mt-3 space-y-4">
              {activityGroups.map((group) => (
                <div key={group.id}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.emoji} {group.label}
                  </p>
                  <ul>
                    {group.items.map((row) => (
                      <li
                        key={row.activityId}
                        className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
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

        {!loading && sortedMembers.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Friends</h2>
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
            <ul className="mt-1">
              {sortedMembers.map((user) => (
                <li
                  key={user._id}
                  className="flex flex-col gap-2 border-b border-border py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
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
                            'text-[11px] font-semibold',
                            user.status === 'active' ? 'text-success' : 'text-muted-foreground'
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
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
                      onClick={() => sendWhatsAppReminder(user)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Remind
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && referralStats.totalReferrals === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No friends yet. Share your code to get started.
          </p>
        ) : null}
      </div>
    </MainLayout>
  );
}
