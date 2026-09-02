'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore, type Profile } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import {
  settingsBtnClass,
  settingsFieldClass,
  settingsTextareaClass,
} from '@/components/settings/settingsUi';
import { cn } from '@/lib/utils';

interface ProfileEditSheetProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
}

/** Soft-normalize link; returns '' when empty or not a usable http(s) URL. */
function normalizeWebsite(value: string): string {
  let trimmed = value.trim().replace(/^['"“”‘’]+|['"“”‘’]+$/g, '').trim();
  if (!trimmed) return '';

  if (/^@[A-Za-z0-9._]+$/.test(trimmed)) {
    trimmed = `https://www.instagram.com/${trimmed.slice(1)}`;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  trimmed = trimmed.replace(/\s+/g, '');

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.replace(/\.$/, '').toLowerCase();
    if (!host) return '';
    if (host !== 'localhost' && (!host.includes('.') || host.startsWith('.') || host.endsWith('.'))) {
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
}

export function ProfileEditSheet({ open, onClose, profileId }: ProfileEditSheetProps) {
  const queryClient = useQueryClient();
  const { selectedProfile, setSelectedProfile, setProfiles, setUser, user } = useAuthStore();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [publicHighlight, setPublicHighlight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !selectedProfile) return;
    setName(selectedProfile.name || '');
    setBio(selectedProfile.bio || '');
    setWebsite(selectedProfile.website || '');
    setPublicHighlight(selectedProfile.publicHighlight || '');
    setError('');
  }, [open, selectedProfile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    const websiteRaw = website.trim();
    const websiteNormalized = normalizeWebsite(website);
    if (websiteRaw && !websiteNormalized) {
      setError('Enter a valid website URL (e.g. instagram.com/you), or leave it blank.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authAPI.updateProfile({
        name: trimmedName,
        bio: bio.trim().slice(0, 150),
        publicHighlight: publicHighlight.trim().slice(0, 200),
        website: websiteNormalized,
      });
      const updatedProfiles = response.data.data.profiles as Profile[];
      setProfiles(updatedProfiles);
      const updated =
        updatedProfiles.find((profile) => profile._id === selectedProfile?._id) ||
        updatedProfiles.find((profile) => profile._id === profileId) ||
        null;
      setSelectedProfile(updated);
      if (
        user &&
        updated &&
        (updated.type === 'primary' || updated.relationship === 'self')
      ) {
        setUser({ ...user, name: trimmedName });
      }
      void queryClient.invalidateQueries({ queryKey: ['publicProfile', profileId] });
      void queryClient.invalidateQueries({ queryKey: ['publicProfile', selectedProfile?._id] });
      onClose();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })
        ?.response?.data;
      const msg = data?.message || data?.error?.message;
      setError(msg || 'Couldn’t save profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
        onClick={() => !loading && onClose()}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-surface shadow-xl',
          'sm:mx-4 sm:rounded-3xl'
        )}
      >
        <div className="px-4 py-3">
          <p className="text-center text-sm font-semibold text-foreground">Edit profile</p>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 80));
                setError('');
              }}
              maxLength={80}
              className={settingsFieldClass}
              placeholder="Name"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Bio</label>
              <span className="text-[11px] text-muted-foreground">{bio.length}/150</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => {
                setBio(e.target.value.slice(0, 150));
                setError('');
              }}
              rows={3}
              maxLength={150}
              className={cn(settingsTextareaClass, 'resize-none')}
              placeholder="Write a short bio…"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Public highlight
              </label>
              <span className="text-[11px] text-muted-foreground">{publicHighlight.length}/200</span>
            </div>
            <textarea
              value={publicHighlight}
              onChange={(e) => {
                setPublicHighlight(e.target.value.slice(0, 200));
                setError('');
              }}
              rows={2}
              maxLength={200}
              className={cn(settingsTextareaClass, 'resize-none')}
              placeholder="One thing you want people to know…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Website / link
            </label>
            <input
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value.slice(0, 200));
                setError('');
              }}
              maxLength={200}
              inputMode="url"
              autoComplete="url"
              className={settingsFieldClass}
              placeholder="instagram.com/you"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Optional. Example: instagram.com/you — leave blank if none.
            </p>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => !loading && onClose()}
              className={cn('w-full sm:w-auto', settingsBtnClass)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void save()}
              className={cn('w-full sm:w-auto', settingsBtnClass)}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
