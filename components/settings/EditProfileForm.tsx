'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore, type Profile } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarPicker } from '@/components/settings/AvatarPicker';
import {
  AVATAR_STYLE,
  buildDiceBearAvatarUrl,
  isUploadedAvatarUrl,
} from '@/lib/utils/avatar';
import { cn } from '@/lib/utils';
import {
  settingsFieldClass,
  settingsTextareaClass,
  settingsBtnClass,
} from '@/components/settings/settingsUi';
import {
  applyMascotTheme,
  DEFAULT_MASCOT_COLOR,
  normalizeMascotColor,
  resolveDefaultLanding,
  type DefaultLandingPath,
} from '@/lib/theme/mascotTheme';

const FIELD_CLASS = settingsTextareaClass;

interface EditProfileFormProps {
  onSaved?: () => void;
  onCancel?: () => void;
}

function buildFormState(profile: Profile) {
  return {
    name: profile.name ?? '',
    bio: profile.bio ?? '',
    website: profile.website ?? '',
    publicHighlight: profile.publicHighlight ?? '',
    avatarSeed: profile.avatarSeed || profile.name || profile._id || 'happy-first',
    avatarUrl: profile.avatarUrl || null,
    avatarStyle:
      profile.avatarStyle === 'uploaded'
        ? 'uploaded'
        : profile.avatarStyle || AVATAR_STYLE,
    profileData: {
      profile: {
        health: profile.profile?.health ?? '',
        family: profile.profile?.family ?? '',
        profession: profile.profile?.profession ?? '',
        schedule: profile.profile?.schedule ?? '',
        challenges: profile.profile?.challenges ?? '',
        goals: profile.profile?.goals ?? '',
        likes: profile.profile?.likes ?? '',
        personalCare: profile.profile?.personalCare ?? '',
        dislikes: profile.profile?.dislikes ?? '',
        medicalConditions: profile.profile?.medicalConditions ?? '',
      },
      preferences: {
        tone: (profile.preferences?.tone ?? 'coach') as 'soft' | 'coach' | 'strict',
        allowMessages: profile.preferences?.allowMessages !== false,
        mascotName: profile.preferences?.mascotName ?? '',
        mascotColor: normalizeMascotColor(profile.preferences?.mascotColor),
        defaultLanding: resolveDefaultLanding(profile.preferences?.defaultLanding),
      },
    },
  };
}

export default function EditProfileForm({ onSaved, onCancel }: EditProfileFormProps) {
  const { selectedProfile, setProfiles, setSelectedProfile, setUser, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [publicHighlight, setPublicHighlight] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<string>(AVATAR_STYLE);
  const [baseline, setBaseline] = useState<ReturnType<typeof buildFormState> | null>(null);
  const [profileData, setProfileData] = useState({
    profile: {
      health: '',
      family: '',
      profession: '',
      schedule: '',
      challenges: '',
      goals: '',
      likes: '',
      personalCare: '',
      dislikes: '',
      medicalConditions: '',
    },
    preferences: {
      tone: 'coach' as 'soft' | 'coach' | 'strict',
      allowMessages: true,
      mascotName: '',
      mascotColor: DEFAULT_MASCOT_COLOR,
      defaultLanding: '/home' as DefaultLandingPath,
    },
  });

  const applyFormState = (next: ReturnType<typeof buildFormState>) => {
    setName(next.name);
    setBio(next.bio);
    setWebsite(next.website);
    setPublicHighlight(next.publicHighlight);
    setAvatarSeed(next.avatarSeed);
    setAvatarUrl(next.avatarUrl);
    setAvatarStyle(next.avatarStyle);
    setProfileData(next.profileData);
  };

  useEffect(() => {
    if (!selectedProfile) return;
    const next = buildFormState(selectedProfile);
    setBaseline(next);
    applyFormState(next);
    setError('');
    setMessage('');
  }, [selectedProfile?._id]);

  const handleCancel = () => {
    if (loading) return;
    if (baseline && selectedProfile) {
      applyFormState(baseline);
      const restored = {
        ...selectedProfile,
        name: baseline.name,
        bio: baseline.bio,
        website: baseline.website,
        publicHighlight: baseline.publicHighlight,
        avatarSeed: baseline.avatarSeed,
        avatarUrl: baseline.avatarUrl,
        avatarStyle: baseline.avatarStyle,
      };
      setSelectedProfile(restored);
      setProfiles(
        (useAuthStore.getState().profiles ?? []).map((p) =>
          p._id === selectedProfile._id ? restored : p
        )
      );
    }
    setError('');
    setMessage('');
    onCancel?.();
    if (baseline) {
      applyMascotTheme(baseline.profileData.preferences.mascotColor);
    }
  };

  const updateProfileField = (field: keyof typeof profileData.profile, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || loading) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const uploaded = isUploadedAvatarUrl(avatarUrl) || avatarStyle === 'uploaded';
    const seed = uploaded ? null : avatarSeed.trim() || trimmedName;
    const nextAvatarUrl = uploaded
      ? avatarUrl
      : buildDiceBearAvatarUrl(seed || trimmedName, AVATAR_STYLE);

    try {
      const response = await authAPI.updateProfile({
        name: trimmedName,
        bio: bio.trim().slice(0, 150),
        publicHighlight: publicHighlight.trim().slice(0, 200),
        website: (() => {
          const trimmed = website
            .trim()
            .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
            .trim();
          if (!trimmed) return '';
          let value = trimmed;
          if (/^@[A-Za-z0-9._]+$/.test(value)) {
            value = `https://www.instagram.com/${value.slice(1)}`;
          } else if (!/^https?:\/\//i.test(value)) {
            value = `https://${value}`;
          }
          value = value.replace(/\s+/g, '');
          try {
            const parsed = new URL(value);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
            const host = parsed.hostname.replace(/\.$/, '').toLowerCase();
            if (
              !host ||
              (host !== 'localhost' &&
                (!host.includes('.') || host.startsWith('.') || host.endsWith('.')))
            ) {
              return '';
            }
            let out = parsed.href;
            if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
              out = out.replace(/\/$/, '');
            }
            return out.slice(0, 200);
          } catch {
            return '';
          }
        })(),
        avatarSeed: seed,
        avatarStyle: uploaded ? 'uploaded' : AVATAR_STYLE,
        avatarUrl: nextAvatarUrl,
        profile: profileData.profile,
        preferences: {
          tone: profileData.preferences.tone,
          allowMessages: profileData.preferences.allowMessages,
          mascotName: selectedProfile.preferences?.mascotName,
          mascotColor: selectedProfile.preferences?.mascotColor,
          defaultLanding: selectedProfile.preferences?.defaultLanding,
        },
      });
      const updatedProfiles = response.data.data.profiles as Profile[];
      setProfiles(updatedProfiles);
      const updated =
        updatedProfiles.find((profile) => profile._id === selectedProfile._id) || null;
      setSelectedProfile(updated);

      if (
        user &&
        updated &&
        (updated.type === 'primary' || updated.relationship === 'self')
      ) {
        setUser({ ...user, name: trimmedName });
      }

      if (updated) {
        setBaseline(buildFormState(updated));
        applyMascotTheme(updated.preferences?.mascotColor);
      }

      const coinRewards = (response.data.data as { coinRewards?: { awarded?: { reason: string; amount: number }[] } })
        ?.coinRewards?.awarded;
      if (coinRewards?.length) {
        const total = coinRewards.reduce((sum, row) => sum + (row.amount || 0), 0);
        setMessage(
          `Profile updated successfully. You earned ${total} Happy Coin${total === 1 ? '' : 's'}!`
        );
      } else {
        setMessage('Profile updated successfully.');
      }
      onSaved?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Name & avatar
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Display name
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
                setMessage('');
              }}
              placeholder="Your name"
              maxLength={80}
              required
              className={settingsFieldClass}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Bio</label>
              <span className="text-[11px] text-muted-foreground">{bio.length}/150</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => {
                setBio(e.target.value.slice(0, 150));
                setError('');
                setMessage('');
              }}
              rows={3}
              maxLength={150}
              placeholder="Write a short bio…"
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Public highlight
              </label>
              <span className="text-[11px] text-muted-foreground">
                {publicHighlight.length}/200
              </span>
            </div>
            <textarea
              value={publicHighlight}
              onChange={(e) => {
                setPublicHighlight(e.target.value.slice(0, 200));
                setError('');
                setMessage('');
              }}
              rows={2}
              maxLength={200}
              placeholder="One thing you want people to know — a motto, favourite activity, or achievement…"
              className={FIELD_CLASS}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Shown on your public profile. Optional. Updating your profile in a new quarter can
              earn 10 Happy Coins.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Website / link
            </label>
            <Input
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value.slice(0, 200));
                setError('');
                setMessage('');
              }}
              placeholder="https://example.com"
              maxLength={200}
              inputMode="url"
              className={settingsFieldClass}
            />
          </div>
          <AvatarPicker
            name={name}
            profileId={selectedProfile?._id}
            seed={avatarSeed}
            avatarUrl={avatarUrl}
            onChange={(next) => {
              setAvatarSeed(next.seed || '');
              setAvatarUrl(next.url);
              setAvatarStyle(next.style);
              setError('');
              setMessage('');
              if (selectedProfile && next.url) {
                const patched = {
                  ...selectedProfile,
                  avatarSeed: next.seed,
                  avatarUrl: next.url,
                  avatarStyle: next.style,
                };
                setSelectedProfile(patched);
                setProfiles(
                  (useAuthStore.getState().profiles ?? []).map((p) =>
                    p._id === selectedProfile._id ? patched : p
                  )
                );
              }
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          About you
        </h3>
        <div className="space-y-3">
          {(
            [
              ['health', 'Health status', 'Generally healthy, occasional back pain…', true],
              ['family', 'Family', 'Married with 2 kids', false],
              ['personalCare', 'Personal care', 'Daily skincare routine', false],
              ['medicalConditions', 'Medical conditions', 'Diabetes, asthma', false],
              ['profession', 'Profession', 'Software engineer', false],
              ['schedule', 'Daily schedule', '9–6 work, evenings free', false],
            ] as const
          ).map(([field, label, placeholder, multiline]) => (
            <div key={field}>
              <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
              {multiline ? (
                <textarea
                  value={profileData.profile[field]}
                  onChange={(e) => updateProfileField(field, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  className={cn(FIELD_CLASS, 'min-h-[4.5rem] resize-y')}
                />
              ) : (
                <Input
                  value={profileData.profile[field]}
                  onChange={(e) => updateProfileField(field, e.target.value)}
                  placeholder={placeholder}
                  className={settingsFieldClass}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Goals & preferences
        </h3>
        <div className="space-y-3">
          {(
            [
              ['challenges', 'Challenges', 'Finding time for exercise', true],
              ['goals', 'Goals', 'Lose 5kg, improve flexibility', true],
              ['likes', 'Likes', 'Yoga, swimming', false],
              ['dislikes', 'Dislikes', 'Running', false],
            ] as const
          ).map(([field, label, placeholder, multiline]) => (
            <div key={field}>
              <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
              {multiline ? (
                <textarea
                  value={profileData.profile[field]}
                  onChange={(e) => updateProfileField(field, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  className={cn(FIELD_CLASS, 'min-h-[4.5rem] resize-y')}
                />
              ) : (
                <Input
                  value={profileData.profile[field]}
                  onChange={(e) => updateProfileField(field, e.target.value)}
                  placeholder={placeholder}
                  className={settingsFieldClass}
                />
              )}
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Motivation tone
            </label>
            <select
              value={profileData.preferences.tone}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    tone: e.target.value as 'soft' | 'coach' | 'strict',
                  },
                }))
              }
              className={cn(FIELD_CLASS, 'h-10')}
            >
              <option value="soft">Soft (like a mother)</option>
              <option value="coach">Coach (like a friend)</option>
              <option value="strict">Strict (like a father)</option>
            </select>
          </div>

          <label className="flex items-start gap-3 rounded-none border border-[#dbdbdb] bg-[#fafafa] px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={profileData.preferences.allowMessages}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    allowMessages: e.target.checked,
                  },
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Allow messages from other members
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                People can start a chat from your public profile when this is on.
              </span>
            </span>
          </label>
        </div>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={handleCancel}
          className={cn('w-full sm:w-auto', settingsBtnClass)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedProfile || loading} className={cn('w-full sm:w-auto', settingsBtnClass)}>
          {loading ? 'Saving…' : 'Submit'}
        </Button>
      </div>
    </form>
  );
}
