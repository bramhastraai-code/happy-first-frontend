'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Dices,
  FolderOpen,
  ImageIcon,
  Loader2,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AVATAR_GALLERY_SEEDS,
  AVATAR_STYLE,
  buildDiceBearAvatarUrl,
  isUploadedAvatarUrl,
  randomAvatarSeed,
  resolveProfileAvatarUrl,
} from '@/lib/utils/avatar';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { authAPI } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

export type AvatarSelection = {
  seed: string | null;
  url: string | null;
  style: string;
};

interface AvatarPickerProps {
  name: string;
  profileId?: string;
  seed: string;
  avatarUrl?: string | null;
  onChange: (next: AvatarSelection) => void;
  className?: string;
}

type ModalView = 'menu' | 'gallery';

export function AvatarPicker({
  name,
  profileId,
  seed,
  avatarUrl,
  onChange,
  className,
}: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ModalView>('menu');
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const previewUrl =
    resolveProfileAvatarUrl({
      avatarUrl,
      avatarSeed: seed,
      avatarStyle: AVATAR_STYLE,
      name,
    }) || buildDiceBearAvatarUrl(seed || name || 'happy-first', AVATAR_STYLE, 160);

  const hasUploaded = isUploadedAvatarUrl(avatarUrl);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploading) closeModal();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, uploading]);

  const closeModal = () => {
    if (uploading) return;
    setOpen(false);
    setView('menu');
    setError(null);
  };

  const applyGenerated = (nextSeed: string) => {
    const safeSeed = nextSeed.trim() || name.trim() || 'happy-first';
    onChange({
      seed: safeSeed,
      url: buildDiceBearAvatarUrl(safeSeed, AVATAR_STYLE),
      style: AVATAR_STYLE,
    });
    closeModal();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !profileId) {
      setError(profileId ? 'Choose an image' : 'Save profile context missing');
      return;
    }
    const looksLikeImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|heic|heif|bmp|avif)$/i.test(file.name);
    if (!looksLikeImage) {
      setError('Please choose an image from your gallery or files.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImageForUpload(file, { maxEdge: 720, quality: 0.85 });
      const res = await authAPI.uploadAvatar(profileId, compressed, 'avatar.jpg');
      const profile = res.data.data.profile;
      onChange({
        seed: null,
        url: profile.avatarUrl || null,
        style: 'uploaded',
      });
      closeModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not upload photo';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    const fallback = name.trim() || seed || 'happy-first';
    applyGenerated(fallback);
  };

  return (
    <>
      <div className={cn('rounded-2xl border border-border bg-secondary/40 p-4', className)}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setView('menu');
              setOpen(true);
            }}
            className="group relative shrink-0"
            aria-label="Change profile photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="h-24 w-24 rounded-full border border-border bg-surface object-cover shadow-sm"
            />
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground shadow-sm transition-transform group-active:scale-95">
              <Camera className="h-4 w-4" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Profile photo</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Tap to upload a photo or pick an avatar
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setView('menu');
                setOpen(true);
              }}
            >
              Change photo
            </Button>
          </div>
        </div>
      </div>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                onClick={closeModal}
                disabled={uploading}
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="avatar-picker-title"
                className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-[var(--shadow-float)] sm:rounded-3xl"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h2 id="avatar-picker-title" className="text-base font-semibold text-foreground">
                      {view === 'gallery' ? 'Choose avatar' : 'Profile photo'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {view === 'gallery'
                        ? 'Pick a look from the gallery'
                        : 'Upload your photo or choose an avatar'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={uploading}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {view === 'menu' ? (
                  <div className="space-y-1 p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                    <div className="flex justify-center py-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt=""
                        className="h-28 w-28 rounded-full border border-border object-cover"
                      />
                    </div>

                    <MenuAction
                      icon={<ImageIcon className="h-5 w-5" />}
                      label="Device gallery"
                      description="Photos, albums, and camera roll"
                      disabled={uploading || !profileId}
                      onClick={() => galleryInputRef.current?.click()}
                    />
                    <MenuAction
                      icon={<FolderOpen className="h-5 w-5" />}
                      label="Browse all files"
                      description="Files app, Downloads, and all albums"
                      disabled={uploading || !profileId}
                      onClick={() => filesInputRef.current?.click()}
                    />
                    <MenuAction
                      icon={<Camera className="h-5 w-5" />}
                      label="Take photo"
                      description="Use camera"
                      disabled={uploading || !profileId}
                      onClick={() => cameraInputRef.current?.click()}
                    />
                    <MenuAction
                      icon={<Smile className="h-5 w-5" />}
                      label="Choose avatar"
                      description="Browse avatar gallery"
                      disabled={uploading}
                      onClick={() => setView('gallery')}
                    />
                    <MenuAction
                      icon={<Dices className="h-5 w-5" />}
                      label="Random avatar"
                      description="Generate a new look"
                      disabled={uploading}
                      onClick={() => applyGenerated(randomAvatarSeed())}
                    />
                    {hasUploaded ? (
                      <MenuAction
                        icon={<Trash2 className="h-5 w-5 text-destructive" />}
                        label="Remove photo"
                        description="Switch back to an avatar"
                        disabled={uploading}
                        destructive
                        onClick={removePhoto}
                      />
                    ) : null}

                    {uploading ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </div>
                    ) : null}
                    {error ? (
                      <p className="px-3 py-2 text-center text-xs text-destructive">{error}</p>
                    ) : null}
                    {!profileId ? (
                      <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                        Select a profile to upload a photo.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col overflow-hidden pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                    <div className="flex items-center justify-end border-b border-border px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => applyGenerated(randomAvatarSeed())}
                      >
                        <Dices className="h-3.5 w-3.5" />
                        Random
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 overflow-y-auto p-4 sm:grid-cols-5">
                      {AVATAR_GALLERY_SEEDS.map((item) => {
                        const url = buildDiceBearAvatarUrl(item, AVATAR_STYLE, 96);
                        const selected = !hasUploaded && seed === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => applyGenerated(item)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-colors',
                              selected
                                ? 'bg-primary-soft ring-2 ring-primary'
                                : 'hover:bg-secondary'
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={item}
                              className="h-14 w-14 rounded-full border border-border bg-secondary object-cover"
                            />
                            <span className="truncate text-[10px] font-medium capitalize text-muted-foreground">
                              {item}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void handleFile(file);
                  }}
                />
                {/* No accept — opens system file manager (all albums / Files), not Google Photos only */}
                <input
                  ref={filesInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void handleFile(file);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void handleFile(file);
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function MenuAction({
  icon,
  label,
  description,
  onClick,
  disabled,
  destructive,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-secondary disabled:opacity-50',
        destructive && 'hover:bg-destructive/10'
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold',
            destructive ? 'text-destructive' : 'text-foreground'
          )}
        >
          {label}
        </span>
        <span className="block text-[11px] text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
