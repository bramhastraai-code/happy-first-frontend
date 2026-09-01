'use client';

import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { MapPin, Pencil, User } from 'lucide-react';

const PROFILE_SNIPPET_FIELDS: Array<{
  key: keyof NonNullable<Profile['profile']>;
  label: string;
}> = [
  { key: 'profession', label: 'Profession' },
  { key: 'goals', label: 'Goals' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'likes', label: 'Likes' },
  { key: 'health', label: 'Health' },
  { key: 'schedule', label: 'Schedule' },
];

interface ProfileDocumentHeroProps {
  profile: Profile | null;
  userName?: string | null;
  userCity?: string | null;
  completionPercentage: number;
  onEditProfile: () => void;
  className?: string;
}

export default function ProfileDocumentHero({
  profile,
  userName,
  userCity,
  completionPercentage,
  onEditProfile,
  className,
}: ProfileDocumentHeroProps) {
  const displayName = profile?.name || userName || 'Your profile';
  const city = userCity;
  const snippets = PROFILE_SNIPPET_FIELDS.map(({ key, label }) => {
    const value = profile?.profile?.[key];
    if (value == null || String(value).trim() === '') return null;
    return { label, value: String(value).trim() };
  }).filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="border-b border-border bg-gradient-to-br from-primary-soft/50 via-surface to-surface px-4 py-5 sm:px-5">
        <div className="flex items-start gap-4">
          <ProfileAvatar
            name={displayName}
            avatarUrl={profile?.avatarUrl}
            avatarSeed={profile?.avatarSeed}
            avatarStyle={profile?.avatarStyle}
            size="xl"
            rounded="2xl"
            className="ring-2 ring-primary/15"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Profile
            </p>
            <h1 className="mt-0.5 truncate text-xl font-bold text-foreground">{displayName}</h1>
            {city ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{city}</span>
              </p>
            ) : null}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Profile document</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {completionPercentage}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {snippets.length > 0 ? (
          <dl className="space-y-3">
            {snippets.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border px-3 py-4">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Complete your profile document</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add lifestyle details for better recommendations and a one-time 100 coin bonus at
                100%.
              </p>
            </div>
          </div>
        )}

        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEditProfile}>
          <Pencil className="h-3.5 w-3.5" />
          {completionPercentage < 100 ? 'Complete profile' : 'Edit profile'}
        </Button>
      </div>
    </section>
  );
}
