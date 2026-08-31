'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore, type Profile } from '@/lib/store/authStore';
import {
  DEFAULT_LANDING_OPTIONS,
  resolveDefaultLanding,
  type DefaultLandingPath,
} from '@/lib/theme/mascotTheme';
import { cn } from '@/lib/utils';

/**
 * Settings control: pick which page opens after profile select / login.
 * Rendered inside a CollapsibleSection on the Settings page.
 */
export default function DefaultLandingSetting() {
  const { selectedProfile, setProfiles, setSelectedProfile } = useAuthStore();
  const [value, setValue] = useState<DefaultLandingPath>('/home');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(resolveDefaultLanding(selectedProfile?.preferences?.defaultLanding));
    setMessage('');
    setError('');
  }, [selectedProfile?._id, selectedProfile?.preferences?.defaultLanding]);

  if (!selectedProfile) return null;

  const save = async (next: DefaultLandingPath) => {
    if (saving || next === value) return;
    setSaving(true);
    setError('');
    setMessage('');
    const previous = value;
    setValue(next);

    try {
      const response = await authAPI.updateProfile({
        preferences: {
          tone: selectedProfile.preferences?.tone,
          allowMessages: selectedProfile.preferences?.allowMessages,
          mascotName: selectedProfile.preferences?.mascotName,
          mascotColor: selectedProfile.preferences?.mascotColor,
          defaultLanding: next,
        },
      });
      const updatedProfiles = response.data.data.profiles as Profile[];
      setProfiles(updatedProfiles);
      const updated =
        updatedProfiles.find((profile) => profile._id === selectedProfile._id) || null;
      setSelectedProfile(updated);
      setMessage('Default landing saved.');
    } catch (err: unknown) {
      setValue(previous);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(msg || 'Could not save default landing. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        After you choose a profile, open this bottom-nav page first. Tap to change.
        {saving ? (
          <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin align-text-bottom" />
        ) : null}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {DEFAULT_LANDING_OPTIONS.map((opt, index) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => void save(opt.value)}
              className={cn(
                'flex items-center gap-2.5 rounded-none border px-3 py-2.5 text-left transition',
                selected
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-surface text-foreground hover:border-primary/40',
                saving && 'opacity-70'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{opt.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {message ? <p className="text-xs text-primary">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
