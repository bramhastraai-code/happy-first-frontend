'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ImageIcon, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { buildDiceBearAvatarUrl } from '@/lib/utils/avatar';

/** Kept for older communities that stored DiceBear seeds. */
export const COMMUNITY_AVATAR_STYLE = 'icons' as const;

type FitnessIcon = {
  emoji: string;
  label: string;
  bg: string;
};

/** Fitness / wellness community icons only. */
export const COMMUNITY_ICON_PRESETS: FitnessIcon[] = [
  { emoji: '🏃', label: 'Running', bg: 'bg-orange-100' },
  { emoji: '💪', label: 'Strength', bg: 'bg-red-100' },
  { emoji: '🧘', label: 'Yoga', bg: 'bg-violet-100' },
  { emoji: '🚴', label: 'Cycling', bg: 'bg-sky-100' },
  { emoji: '🥾', label: 'Hiking', bg: 'bg-amber-100' },
  { emoji: '🏊', label: 'Swim', bg: 'bg-cyan-100' },
  { emoji: '🏋️', label: 'Gym', bg: 'bg-rose-100' },
  { emoji: '🥊', label: 'Boxing', bg: 'bg-red-50' },
  { emoji: '🤸', label: 'Flexibility', bg: 'bg-fuchsia-100' },
  { emoji: '🚶', label: 'Walking', bg: 'bg-lime-100' },
  { emoji: '🧠', label: 'Mind', bg: 'bg-indigo-100' },
  { emoji: '❤️', label: 'Heart', bg: 'bg-pink-100' },
  { emoji: '🔥', label: 'Streak', bg: 'bg-orange-50' },
  { emoji: '⚡', label: 'Energy', bg: 'bg-yellow-100' },
  { emoji: '🌱', label: 'Growth', bg: 'bg-emerald-100' },
  { emoji: '🌿', label: 'Nature', bg: 'bg-green-100' },
  { emoji: '🥗', label: 'Nutrition', bg: 'bg-lime-50' },
  { emoji: '💧', label: 'Hydration', bg: 'bg-blue-100' },
  { emoji: '😴', label: 'Recovery', bg: 'bg-slate-100' },
  { emoji: '🏆', label: 'Goals', bg: 'bg-amber-50' },
  { emoji: '🎯', label: 'Focus', bg: 'bg-orange-100' },
  { emoji: '☀️', label: 'Morning', bg: 'bg-yellow-50' },
  { emoji: '🌙', label: 'Evening', bg: 'bg-indigo-50' },
  { emoji: '🤝', label: 'Together', bg: 'bg-teal-100' },
];

export const COMMUNITY_ICON_EMOJIS = COMMUNITY_ICON_PRESETS.map((item) => item.emoji);

export type CommunityAvatarSelection = {
  icon: string | null;
  avatarSeed: string | null;
  avatarUrl: string | null;
  avatarStyle: string;
  pendingFile?: Blob | null;
  localPreviewUrl?: string | null;
};

interface CommunityAvatarPickerProps {
  name: string;
  value: CommunityAvatarSelection;
  onChange: (next: CommunityAvatarSelection) => void;
  className?: string;
}

type ModalView = 'menu' | 'icons';

function resolvePreview(value: CommunityAvatarSelection, name: string) {
  if (value.localPreviewUrl) return { kind: 'image' as const, src: value.localPreviewUrl };
  if (value.avatarStyle === 'uploaded' && value.avatarUrl) {
    return { kind: 'image' as const, src: resolveMediaUrl(value.avatarUrl) };
  }
  // Prefer emoji icon whenever present
  if (value.icon && String(value.icon).trim()) {
    const icon = String(value.icon).trim();
    const preset = COMMUNITY_ICON_PRESETS.find((item) => item.emoji === icon);
    return { kind: 'icon' as const, icon, bg: preset?.bg || 'bg-orange-100' };
  }
  if (value.avatarUrl && value.avatarStyle !== 'emoji') {
    return { kind: 'image' as const, src: resolveMediaUrl(value.avatarUrl) };
  }
  if (value.avatarSeed) {
    const src = buildDiceBearAvatarUrl(
      value.avatarSeed || name || 'community',
      value.avatarStyle && value.avatarStyle !== 'uploaded' && value.avatarStyle !== 'emoji'
        ? value.avatarStyle
        : COMMUNITY_AVATAR_STYLE,
      160
    );
    return { kind: 'image' as const, src };
  }
  return {
    kind: 'letter' as const,
    letter: (name.trim().slice(0, 1) || 'C').toUpperCase(),
  };
}

export function CommunityAvatarPicker({
  name,
  value,
  onChange,
  className,
}: CommunityAvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ModalView>('menu');
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => resolvePreview(value, name), [value, name]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const closeModal = () => {
    setOpen(false);
    setView('menu');
    setError(null);
  };

  const clearLocalPreview = () => {
    if (value.localPreviewUrl) URL.revokeObjectURL(value.localPreviewUrl);
  };

  const applyIcon = (icon: string) => {
    clearLocalPreview();
    onChange({
      icon,
      avatarSeed: null,
      avatarUrl: null,
      avatarStyle: 'emoji',
      pendingFile: null,
      localPreviewUrl: null,
    });
    closeModal();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageForUpload(file, { maxEdge: 720, quality: 0.85 });
      clearLocalPreview();
      const localPreviewUrl = URL.createObjectURL(compressed);
      onChange({
        icon: null,
        avatarSeed: null,
        avatarUrl: null,
        avatarStyle: 'uploaded',
        pendingFile: compressed,
        localPreviewUrl,
      });
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image');
    }
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
            aria-label="Change community icon"
          >
            <span
              className={cn(
                'flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border shadow-sm',
                preview.kind === 'icon' ? preview.bg : 'bg-surface'
              )}
            >
              {preview.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.src} alt="" className="h-full w-full object-cover" />
              ) : preview.kind === 'icon' ? (
                <span className="text-3xl">{preview.icon}</span>
              ) : (
                <span className="text-2xl font-bold text-foreground">{preview.letter}</span>
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground shadow-sm">
              <Camera className="h-4 w-4" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Community icon</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Upload a photo or pick a fitness icon
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
              Choose icon
            </Button>
          </div>
        </div>
      </div>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/50"
                onClick={closeModal}
              />
              <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:mx-4 sm:rounded-3xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {view === 'menu' ? 'Community icon' : 'Fitness icons'}
                  </p>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto px-4 py-4">
                  {view === 'menu' ? (
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-2 py-5 hover:bg-secondary"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                          <ImageIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-semibold">Upload</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-2 py-5 hover:bg-secondary"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                          <Camera className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-semibold">Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setView('icons')}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-2 py-5 hover:bg-secondary"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                          <Smile className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-semibold">Fitness</span>
                      </button>
                    </div>
                  ) : null}

                  {view === 'icons' ? (
                    <div className="grid grid-cols-4 gap-2.5">
                      {COMMUNITY_ICON_PRESETS.map((item) => (
                        <button
                          key={item.emoji}
                          type="button"
                          onClick={() => applyIcon(item.emoji)}
                          title={item.label}
                          className={cn(
                            'flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border transition-colors',
                            item.bg,
                            value.icon === item.emoji
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent hover:border-border'
                          )}
                        >
                          <span className="text-2xl leading-none">{item.emoji}</span>
                          <span className="max-w-full truncate px-1 text-[9px] font-medium text-muted-foreground">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {error ? (
                    <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

interface CommunityAvatarProps {
  name: string;
  icon?: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-14 w-14 text-lg',
};

export function CommunityAvatar({
  name,
  icon,
  avatarUrl,
  avatarSeed,
  avatarStyle,
  className,
  size = 'sm',
}: CommunityAvatarProps) {
  const preview = resolvePreview(
    {
      icon: icon || null,
      avatarUrl: avatarUrl || null,
      avatarSeed: avatarSeed || null,
      avatarStyle: avatarStyle || COMMUNITY_AVATAR_STYLE,
    },
    name
  );

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold text-foreground',
        sizeClass[size],
        preview.kind === 'icon' ? preview.bg : 'bg-secondary',
        className
      )}
    >
      {preview.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.src} alt="" className="h-full w-full object-cover" />
      ) : preview.kind === 'icon' ? (
        <span className={size === 'sm' ? 'text-lg' : 'text-2xl'}>{preview.icon}</span>
      ) : (
        preview.letter
      )}
    </span>
  );
}
