'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { AvatarPicker } from '@/components/settings/AvatarPicker';
import { Button } from '@/components/ui/button';
import { useAuthStore, type Profile } from '@/lib/store/authStore';
import { authAPI } from '@/lib/api/auth';
import { useOverlayHistory } from '@/lib/hooks/useOverlayHistory';
import { cn } from '@/lib/utils';
import {
  AVATAR_STYLE,
  buildDiceBearAvatarUrl,
  isUploadedAvatarUrl,
  resolveProfileAvatarUrl,
} from '@/lib/utils/avatar';

type AvatarFields = {
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
};

interface ProfilePhotoButtonProps {
  profile: AvatarFields;
  /** Own profile — show change controls after enlarge */
  canEdit?: boolean;
  className?: string;
  sizeClassName?: string;
}

/**
 * Tap avatar → large preview. Own profile also gets Change photo (inline AvatarPicker).
 */
export function ProfilePhotoButton({
  profile,
  canEdit = false,
  className,
  sizeClassName = 'h-[86px] w-[86px] text-2xl ring-1 ring-border sm:h-24 sm:w-24',
}: ProfilePhotoButtonProps) {
  const { selectedProfile, setSelectedProfile, setProfiles } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  /** Local preview after a successful change (page query may lag). */
  const [localAvatar, setLocalAvatar] = useState<AvatarFields | null>(null);

  const displayProfile = localAvatar ?? profile;
  const previewUrl = resolveProfileAvatarUrl(displayProfile);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setLocalAvatar(null);
  }, [profile.avatarUrl, profile.avatarSeed, profile.avatarStyle]);

  useOverlayHistory({
    open,
    onClose: () => {
      setOpen(false);
      setEditing(false);
      setError('');
    },
    key: 'profile-photo-preview',
  });

  const close = () => {
    setOpen(false);
    setEditing(false);
    setError('');
  };

  const syncStore = (patched: Profile) => {
    setSelectedProfile(patched);
    setProfiles(
      (useAuthStore.getState().profiles ?? []).map((p) =>
        p._id === patched._id ? patched : p
      )
    );
  };

  const handleAvatarChange = async (next: {
    seed: string | null;
    url: string | null;
    style: string;
  }) => {
    if (!canEdit || !selectedProfile?._id || saving) return;
    setSaving(true);
    setError('');
    try {
      const uploaded = isUploadedAvatarUrl(next.url) || next.style === 'uploaded';
      const seed = uploaded
        ? null
        : (next.seed || selectedProfile.name || selectedProfile._id || 'happy-first').trim();
      const avatarUrl = uploaded
        ? next.url
        : buildDiceBearAvatarUrl(seed || selectedProfile.name, AVATAR_STYLE);
      const avatarStyle = uploaded ? 'uploaded' : AVATAR_STYLE;

      let patched: Profile;

      if (uploaded) {
        // uploadAvatar already persisted — sync local store from the returned URL
        patched = {
          ...selectedProfile,
          avatarSeed: null,
          avatarStyle,
          avatarUrl,
        };
        syncStore(patched);
      } else {
        const response = await authAPI.updateProfile({
          avatarSeed: seed,
          avatarStyle,
          avatarUrl,
        });
        const updatedProfiles = response.data.data.profiles as Profile[];
        setProfiles(updatedProfiles);
        patched =
          updatedProfiles.find((p) => p._id === selectedProfile._id) || {
            ...selectedProfile,
            avatarSeed: seed,
            avatarStyle,
            avatarUrl,
          };
        setSelectedProfile(patched);
      }

      setLocalAvatar({
        name: patched.name,
        avatarUrl: patched.avatarUrl,
        avatarSeed: patched.avatarSeed,
        avatarStyle: patched.avatarStyle,
      });
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setError(msg || 'Could not update photo. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        aria-label={canEdit ? 'View or change profile photo' : 'View profile photo'}
      >
        <ProfileAvatar
          name={displayProfile.name}
          avatarUrl={displayProfile.avatarUrl}
          avatarSeed={displayProfile.avatarSeed}
          avatarStyle={displayProfile.avatarStyle}
          size="xl"
          className={sizeClassName}
        />
        {canEdit ? (
          <span className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground shadow-sm sm:h-8 sm:w-8">
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center sm:p-4">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/70"
                onClick={close}
              />
              <div className="relative z-[1] flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-[var(--shadow-float)] sm:rounded-3xl">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {editing ? 'Change photo' : 'Profile photo'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{displayProfile.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-sm"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 stroke-[2.5]" />
                  </button>
                </div>

                {editing && canEdit ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <AvatarPicker
                      mode="embedded"
                      name={selectedProfile?.name || displayProfile.name}
                      profileId={selectedProfile?._id}
                      seed={
                        selectedProfile?.avatarSeed ||
                        displayProfile.avatarSeed ||
                        displayProfile.name ||
                        'happy-first'
                      }
                      avatarUrl={selectedProfile?.avatarUrl ?? displayProfile.avatarUrl}
                      onChange={(next) => void handleAvatarChange(next)}
                    />
                    {saving ? (
                      <p className="px-4 pb-2 text-center text-xs text-muted-foreground">
                        Saving…
                      </p>
                    ) : null}
                    {error ? (
                      <p className="px-4 pb-2 text-center text-xs text-destructive">{error}</p>
                    ) : null}
                    <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setEditing(false)}
                        disabled={saving}
                      >
                        Back to preview
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 px-4 py-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        previewUrl ||
                        buildDiceBearAvatarUrl(
                          displayProfile.name || 'happy-first',
                          AVATAR_STYLE,
                          320
                        )
                      }
                      alt={displayProfile.name}
                      className="h-56 w-56 rounded-full border border-border object-cover shadow-md sm:h-64 sm:w-64"
                    />
                    {canEdit ? (
                      <Button
                        type="button"
                        className="w-full gap-2"
                        onClick={() => {
                          setError('');
                          setEditing(true);
                        }}
                      >
                        <Camera className="h-4 w-4" />
                        Change profile photo
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
