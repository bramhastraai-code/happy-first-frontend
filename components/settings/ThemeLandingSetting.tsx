'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore, type Profile } from '@/lib/store/authStore';
import {
  DEFAULT_LANDING_OPTIONS,
  DEFAULT_MASCOT_COLOR,
  MASCOT_COLOR_PRESETS,
  applyMascotTheme,
  normalizeMascotColor,
  resolveDefaultLanding,
  type DefaultLandingPath,
} from '@/lib/theme/mascotTheme';
import { HappyFirstMascot } from '@/components/ui/HappyFirstMascot';
import { Input } from '@/components/ui/input';
import { settingsFieldClass } from '@/components/settings/settingsUi';
import { cn } from '@/lib/utils';

/** Theme colour + default landing — separate from lifestyle profile questions. */
export default function ThemeLandingSetting() {
  const { selectedProfile, setProfiles, setSelectedProfile } = useAuthStore();
  const [mascotName, setMascotName] = useState('');
  const [mascotColor, setMascotColor] = useState(DEFAULT_MASCOT_COLOR);
  const [defaultLanding, setDefaultLanding] = useState<DefaultLandingPath>('/home');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedProfile) return;
    setMascotName(selectedProfile.preferences?.mascotName || '');
    setMascotColor(normalizeMascotColor(selectedProfile.preferences?.mascotColor));
    setDefaultLanding(resolveDefaultLanding(selectedProfile.preferences?.defaultLanding));
    setMessage('');
    setError('');
  }, [selectedProfile?._id, selectedProfile?.preferences?.mascotColor, selectedProfile?.preferences?.defaultLanding]);

  if (!selectedProfile) return null;

  const save = async (patch: {
    mascotName?: string;
    mascotColor?: string;
    defaultLanding?: DefaultLandingPath;
  }) => {
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');

    const nextName = patch.mascotName ?? mascotName;
    const nextColor = normalizeMascotColor(patch.mascotColor ?? mascotColor);
    const nextLanding = patch.defaultLanding ?? defaultLanding;

    try {
      const response = await authAPI.updateProfile({
        preferences: {
          tone: selectedProfile.preferences?.tone,
          allowMessages: selectedProfile.preferences?.allowMessages !== false,
          mascotName: nextName.trim().slice(0, 40),
          mascotColor: nextColor,
          defaultLanding: nextLanding,
        },
      });
      const updatedProfiles = response.data.data.profiles as Profile[];
      setProfiles(updatedProfiles);
      const updated =
        updatedProfiles.find((profile) => profile._id === selectedProfile._id) || null;
      setSelectedProfile(updated);
      if (updated) {
        setMascotName(updated.preferences?.mascotName || '');
        setMascotColor(normalizeMascotColor(updated.preferences?.mascotColor));
        setDefaultLanding(resolveDefaultLanding(updated.preferences?.defaultLanding));
        applyMascotTheme(updated.preferences?.mascotColor);
      }
      setMessage('Theme & landing saved.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          App theme
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
          <HappyFirstMascot
            size={56}
            title={mascotName.trim() || 'Happy First mascot'}
          />
          <p className="min-w-0 text-xs text-muted-foreground">
            Your mascot colour tints charts, celebrations, and accents across the app.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">Mascot name</label>
          <Input
            value={mascotName}
            onChange={(e) => setMascotName(e.target.value.slice(0, 40))}
            placeholder="Optional nickname"
            maxLength={40}
            className={settingsFieldClass}
            disabled={saving}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">Theme colour</label>
          <div className="flex flex-wrap gap-2">
            {MASCOT_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.label}
                disabled={saving}
                onClick={() => {
                  setMascotColor(preset.value);
                  applyMascotTheme(preset.value);
                  void save({ mascotColor: preset.value });
                }}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition',
                  mascotColor === preset.value
                    ? 'border-foreground scale-110'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: preset.value }}
              />
            ))}
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-input bg-surface px-3 text-xs text-muted-foreground">
              Custom
              <input
                type="color"
                value={normalizeMascotColor(mascotColor)}
                disabled={saving}
                onChange={(e) => {
                  const next = normalizeMascotColor(e.target.value);
                  setMascotColor(next);
                  applyMascotTheme(next);
                }}
                onBlur={() => void save({ mascotColor })}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Default landing
        </p>
        <p className="text-xs text-muted-foreground">
          After you pick a profile, open this page first.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEFAULT_LANDING_OPTIONS.map((opt, index) => {
            const selected = defaultLanding === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => {
                  setDefaultLanding(opt.value);
                  void save({ defaultLanding: opt.value });
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                  selected
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-surface text-foreground hover:border-primary/40'
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
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {saving ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </p>
      ) : null}
      {message ? <p className="text-xs text-primary">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
