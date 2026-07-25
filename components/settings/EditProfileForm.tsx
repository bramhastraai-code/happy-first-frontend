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

const FIELD_CLASS =
  'w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

interface EditProfileFormProps {
  onSaved?: () => void;
}

export default function EditProfileForm({ onSaved }: EditProfileFormProps) {
  const { selectedProfile, setProfiles, setSelectedProfile, setUser, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<string>(AVATAR_STYLE);
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
    },
  });

  useEffect(() => {
    if (!selectedProfile) return;
    setName(selectedProfile.name ?? '');
    setAvatarSeed(
      selectedProfile.avatarSeed ||
        selectedProfile.name ||
        selectedProfile._id ||
        'happy-first'
    );
    setAvatarUrl(selectedProfile.avatarUrl || null);
    setAvatarStyle(
      selectedProfile.avatarStyle === 'uploaded'
        ? 'uploaded'
        : selectedProfile.avatarStyle || AVATAR_STYLE
    );
    setProfileData({
      profile: {
        health: selectedProfile.profile?.health ?? '',
        family: selectedProfile.profile?.family ?? '',
        profession: selectedProfile.profile?.profession ?? '',
        schedule: selectedProfile.profile?.schedule ?? '',
        challenges: selectedProfile.profile?.challenges ?? '',
        goals: selectedProfile.profile?.goals ?? '',
        likes: selectedProfile.profile?.likes ?? '',
        personalCare: selectedProfile.profile?.personalCare ?? '',
        dislikes: selectedProfile.profile?.dislikes ?? '',
        medicalConditions: selectedProfile.profile?.medicalConditions ?? '',
      },
      preferences: {
        tone: selectedProfile.preferences?.tone ?? 'coach',
      },
    });
  }, [selectedProfile]);

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
        avatarSeed: seed,
        avatarStyle: uploaded ? 'uploaded' : AVATAR_STYLE,
        avatarUrl: nextAvatarUrl,
        profile: profileData.profile,
        preferences: profileData.preferences,
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

      setMessage('Profile updated successfully.');
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
        </div>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={!selectedProfile || loading} className="w-full sm:w-auto">
        {loading ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
