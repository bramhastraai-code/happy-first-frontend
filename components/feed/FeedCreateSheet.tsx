'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, ImageIcon, Loader2, Plus, Type, Upload, Video, X } from 'lucide-react';
import { feedAPI, type PublishTarget } from '@/lib/api/feed';
import { followAPI } from '@/lib/api/follow';
import { communityAPI } from '@/lib/api/community';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import {
  renderTextCardImage,
  textCardGradient,
  TEXT_CARD_BACKGROUNDS,
  TEXT_CARD_FONTS,
  TEXT_CARD_MAX_LENGTH,
} from '@/lib/utils/textCardImage';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { SocialPostGuidelines } from '@/components/feed/SocialPostGuidelines';

type CreateKind = PublishTarget;
type PickMode = 'image' | 'video' | 'camera' | 'drop';

type PendingMedia = {
  id: string;
  blob: Blob;
  previewUrl: string;
  mediaType: 'image' | 'video';
};

type TagPerson = {
  profileId: string;
  name: string;
};

interface FeedCreateSheetProps {
  open: boolean;
  onClose: () => void;
  defaultKind?: Exclude<CreateKind, 'both'>;
  /** When set, posts are scoped to this community feed (posts only). */
  communityId?: string;
  onCreated?: () => void;
}

const MAX_POST_IMAGES = 10;
const MAX_COLLABORATORS = 10;

export function FeedCreateSheet({
  open,
  onClose,
  defaultKind = 'post',
  communityId,
  onCreated,
}: FeedCreateSheetProps) {
  const queryClient = useQueryClient();
  const { selectedProfile } = useAuthStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const [kind, setKind] = useState<CreateKind>(communityId ? 'post' : defaultKind);
  const [items, setItems] = useState<PendingMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [collaborators, setCollaborators] = useState<TagPerson[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [alsoPublishToGlobal, setAlsoPublishToGlobal] = useState(false);
  const [isSurpriseProof, setIsSurpriseProof] = useState(false);

  useEffect(() => {
    if (open) setKind(communityId ? 'post' : defaultKind);
  }, [open, defaultKind, communityId]);

  const allowsCollaborators = kind !== 'story';
  const isStoryOnly = kind === 'story';

  const membersQuery = useQuery({
    queryKey: ['communityMembers', communityId, 'feedCreate'],
    enabled: open && !!communityId && allowsCollaborators,
    queryFn: async () => {
      const res = await communityAPI.members(communityId!);
      return res.data.data.members;
    },
  });

  const peopleSearchQuery = useQuery({
    queryKey: ['following', selectedProfile?._id, 'mentions'],
    enabled: open && !communityId && allowsCollaborators && !!selectedProfile?._id,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await followAPI.getFollowing(selectedProfile!._id, { limit: 100 });
      return res.data.data.people || [];
    },
  });

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null || !allowsCollaborators) return [];
    const q = mentionQuery.toLowerCase();
    const selected = new Set(collaborators.map((c) => c.profileId));
    const me = selectedProfile?._id;

    if (communityId) {
      return (membersQuery.data || [])
        .filter((m) => m.profile?.id && m.profile.id !== me && !selected.has(m.profile.id))
        .filter((m) => !q || m.profile.name.toLowerCase().includes(q))
        .slice(0, 8)
        .map((m) => ({ profileId: m.profile.id, name: m.profile.name }));
    }

    // @ tags only resolve people you follow
    return (peopleSearchQuery.data || [])
      .filter((p) => p.profileId !== me && !selected.has(p.profileId))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ profileId: p.profileId, name: p.name }));
  }, [
    mentionQuery,
    allowsCollaborators,
    communityId,
    membersQuery.data,
    peopleSearchQuery.data,
    collaborators,
    selectedProfile?._id,
  ]);

  const clearItems = () => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const resetAndClose = () => {
    clearItems();
    setCaption('');
    setCollaborators([]);
    setMentionQuery(null);
    setLocalError(null);
    setDragOver(false);
    setTextMode(false);
    setText('');
    setBgIndex(0);
    setFontIndex(0);
    setAlsoPublishToGlobal(false);
    setIsSurpriseProof(false);
    uploadMutation.reset();
    onClose();
  };

  const detectMention = (value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const match = before.match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const addCollaborator = (person: TagPerson) => {
    setCollaborators((prev) => {
      if (prev.some((c) => c.profileId === person.profileId)) return prev;
      if (prev.length >= MAX_COLLABORATORS) return prev;
      return [...prev, person];
    });
    setCaption((prev) => {
      const el = captionRef.current;
      const cursor = el?.selectionStart ?? prev.length;
      const before = prev.slice(0, cursor);
      const after = prev.slice(cursor);
      const replaced = before.replace(/@([^\s@]*)$/, `@${person.name} `);
      return `${replaced}${after}`.slice(0, 300);
    });
    setMentionQuery(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const publishTo: PublishTarget = communityId ? 'post' : kind;
      let collabIds =
        publishTo === 'story' ? [] : collaborators.map((c) => c.profileId);

      // Also resolve @Name mentions typed in the caption (even if chip wasn't tapped)
      // Global @ tags only resolve people you follow.
      if (publishTo !== 'story' && caption.trim()) {
        const mentionNames = [
          ...caption.matchAll(/@([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/g),
        ].map((m) => m[1].trim());
        const following = peopleSearchQuery.data || [];
        for (const name of mentionNames) {
          try {
            if (communityId) {
              const members = membersQuery.data || [];
              const hit = members.find(
                (m) => m.profile?.name?.toLowerCase() === name.toLowerCase()
              );
              if (hit?.profile?.id) collabIds.push(hit.profile.id);
            } else {
              const exact = following.find(
                (p) => p.name.toLowerCase() === name.toLowerCase()
              );
              if (exact?.profileId) collabIds.push(exact.profileId);
            }
          } catch {
            // best-effort mention resolve
          }
        }
        collabIds = [...new Set(collabIds)];
      }

      if (textMode) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('Type something first');
        const cardKind = publishTo === 'story' ? 'story' : 'post';
        const blob = await renderTextCardImage({
          text: trimmed,
          background: TEXT_CARD_BACKGROUNDS[bgIndex],
          font: TEXT_CARD_FONTS[fontIndex],
          kind: cardKind,
        });
        const response = await feedAPI.createPost([blob], {
          kind: publishTo,
          publishTo,
          communityId,
          collaboratorProfileIds: collabIds,
          caption: caption.trim() || undefined,
          alsoPublishToGlobal: communityId ? alsoPublishToGlobal : undefined,
          isSurpriseProof: isSurpriseProof || undefined,
          textCard: {
            text: trimmed,
            backgroundId: TEXT_CARD_BACKGROUNDS[bgIndex].id,
            fontId: TEXT_CARD_FONTS[fontIndex].id,
            kind: cardKind,
          },
        });
        return response.data.data;
      }
      if (!items.length) throw new Error('Choose a photo or video first');
      const response = await feedAPI.createPost(
        items.map((item) => item.blob),
        {
          caption,
          kind: publishTo,
          publishTo,
          communityId,
          collaboratorProfileIds: collabIds,
          alsoPublishToGlobal: communityId ? alsoPublishToGlobal : undefined,
          isSurpriseProof: isSurpriseProof || undefined,
        }
      );
      return response.data.data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['feedStories'] }),
        queryClient.invalidateQueries({ queryKey: ['profilePosts'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      if (kind === 'both' && !communityId && data && !data.story) {
        setLocalError(
          'Post shared, but story was not created. Close, refresh, and try Both again.'
        );
        onCreated?.();
        return;
      }
      onCreated?.();
      resetAndClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadMutation.isPending) resetAndClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uploadMutation.isPending]);

  const processFiles = async (fileList: File[], mode: PickMode) => {
    if (!fileList.length) return;
    setLocalError(null);

    try {
      const incoming = [...fileList];
      const hasVideo = incoming.some(
        (file) => file.type.startsWith('video/') || mode === 'video'
      );
      const hasImage = incoming.some(
        (file) => file.type.startsWith('image/') || mode === 'image' || mode === 'camera'
      );

      if (isStoryOnly && incoming.length > 1) {
        throw new Error('Stories support only one photo or video');
      }
      if (hasVideo && hasImage && incoming.length > 1) {
        throw new Error('Choose either images or one video, not both');
      }
      if (hasVideo && incoming.length > 1) {
        throw new Error('Only one video is allowed');
      }

      const nextItems: PendingMedia[] = [];
      for (const file of incoming) {
        const isVideo = file.type.startsWith('video/') || mode === 'video';
        if (isVideo && file.size > 40 * 1024 * 1024) {
          throw new Error('Video must be under 40MB');
        }
        let blob: Blob = file;
        if (!isVideo) {
          blob = await compressImageForUpload(file);
        }
        nextItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          blob,
          previewUrl: URL.createObjectURL(blob),
          mediaType: isVideo ? 'video' : 'image',
        });
      }

      setItems((prev) => {
        const replacingVideo = nextItems.some((item) => item.mediaType === 'video');
        const existingHasVideo = prev.some((item) => item.mediaType === 'video');
        if (isStoryOnly || replacingVideo || existingHasVideo) {
          prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
          return nextItems.slice(0, 1);
        }

        const merged = [...prev, ...nextItems]
          .filter((item) => item.mediaType === 'image')
          .slice(0, MAX_POST_IMAGES);
        const keepIds = new Set(merged.map((item) => item.id));
        prev.forEach((item) => {
          if (!keepIds.has(item.id)) URL.revokeObjectURL(item.previewUrl);
        });
        nextItems.forEach((item) => {
          if (!keepIds.has(item.id)) URL.revokeObjectURL(item.previewUrl);
        });
        return merged;
      });

      if (kind !== 'story' && !hasVideo) {
        // soft notice if user tried to exceed max
        const currentCount = items.filter((item) => item.mediaType === 'image').length;
        if (currentCount + nextItems.length > MAX_POST_IMAGES) {
          setLocalError(`Only the first ${MAX_POST_IMAGES} images were kept`);
        }
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not read that file');
    }
  };

  const handleFileList = (list: FileList | File[] | null | undefined, mode: PickMode) => {
    if (!list) return;
    void processFiles(Array.from(list), mode);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  if (!open) return null;

  const errorMessage =
    localError ||
    (uploadMutation.error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (uploadMutation.error instanceof Error ? uploadMutation.error.message : null);

  const canAddMoreImages =
    kind !== 'story' &&
    items.length > 0 &&
    items.every((item) => item.mediaType === 'image') &&
    items.length < MAX_POST_IMAGES;

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!uploadMutation.isPending) resetAndClose();
        }}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:mx-4 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {communityId ? 'New post' : 'Create'}
            </p>
            <p className="text-xs text-muted-foreground">
              {textMode
                ? kind === 'story'
                  ? 'Text status · 24h'
                  : kind === 'both'
                    ? 'Text · feed + story'
                    : 'Text post'
                : kind === 'story'
                  ? 'Photo, video or text · 24h'
                  : kind === 'both'
                    ? 'Feed + story · up to 10 photos'
                    : 'Up to 10 photos, 1 video, or text'}
            </p>
          </div>
          <button
            type="button"
            disabled={uploadMutation.isPending}
            onClick={resetAndClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {!communityId ? (
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
              {(
                [
                  { id: 'post', label: 'Feed' },
                  { id: 'story', label: 'Story' },
                  { id: 'both', label: 'Both' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setKind(item.id);
                    if (item.id === 'story' && items.length > 1) {
                      setItems((prev) => {
                        prev.slice(1).forEach((media) => URL.revokeObjectURL(media.previewUrl));
                        return prev.slice(0, 1);
                      });
                    }
                    if (item.id === 'story') {
                      setCollaborators([]);
                      setMentionQuery(null);
                    }
                  }}
                  className={cn(
                    'rounded-xl py-2.5 text-sm font-semibold transition-colors',
                    kind === item.id
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {communityId ? (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={alsoPublishToGlobal}
                onChange={(e) => setAlsoPublishToGlobal(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Also post to global feed
              </span>
            </label>
          ) : null}

          {kind !== 'story' ? (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isSurpriseProof}
                onChange={(e) => setIsSurpriseProof(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">Surprise activity proof</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  After you complete this week’s surprise, post proof for +5 extra coins
                </span>
              </span>
            </label>
          ) : null}

          <SocialPostGuidelines />

          {textMode ? (
            <>
              <div
                className={cn(
                  'relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-2xl p-5',
                  kind === 'story' && !communityId
                    ? 'aspect-[9/16] max-w-[260px]'
                    : 'aspect-[4/5] max-w-[320px]'
                )}
                style={{ background: textCardGradient(TEXT_CARD_BACKGROUNDS[bgIndex]) }}
              >
                <textarea
                  value={text}
                  autoFocus
                  maxLength={TEXT_CARD_MAX_LENGTH}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type your status…"
                  rows={Math.min(
                    12,
                    Math.max(2, text.split('\n').length + Math.floor(text.length / 26))
                  )}
                  className={cn(
                    'max-h-full w-full resize-none bg-transparent text-center text-white outline-none placeholder:text-white/70',
                    text.length > 160 ? 'text-lg leading-snug' : 'text-2xl leading-snug',
                    TEXT_CARD_FONTS[fontIndex].className
                  )}
                />
                <span className="absolute bottom-2 right-3 text-[10px] font-medium text-white/70">
                  {text.length}/{TEXT_CARD_MAX_LENGTH}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                {TEXT_CARD_BACKGROUNDS.map((background, index) => (
                  <button
                    key={background.id}
                    type="button"
                    aria-label={background.label}
                    onClick={() => setBgIndex(index)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-transform',
                      index === bgIndex
                        ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface'
                        : 'hover:scale-105'
                    )}
                    style={{ background: textCardGradient(background) }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                {TEXT_CARD_FONTS.map((cardFont, index) => (
                  <button
                    key={cardFont.id}
                    type="button"
                    onClick={() => setFontIndex(index)}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-sm transition-colors',
                      cardFont.className,
                      index === fontIndex
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-secondary/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Aa
                  </button>
                ))}
              </div>

              {allowsCollaborators ? (
                <div className="relative">
                  <input
                    value={mentionQuery ?? ''}
                    onChange={(event) => setMentionQuery(event.target.value)}
                    placeholder={
                      communityId
                        ? 'Tag collaborators (@name)'
                        : 'Tag people you follow (@name)'
                    }
                    className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  {mentionSuggestions.length > 0 ? (
                    <ul className="absolute left-0 right-0 z-20 mt-1 max-h-40 overflow-y-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-float)]">
                      {mentionSuggestions.map((person) => (
                        <li key={person.profileId}>
                          <button
                            type="button"
                            className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                            onClick={() => {
                              setCollaborators((prev) =>
                                prev.some((c) => c.profileId === person.profileId)
                                  ? prev
                                  : [...prev, person].slice(0, MAX_COLLABORATORS)
                              );
                              setMentionQuery('');
                            }}
                          >
                            @{person.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {collaborators.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {collaborators.map((person) => (
                        <button
                          key={person.profileId}
                          type="button"
                          onClick={() =>
                            setCollaborators((prev) =>
                              prev.filter((c) => c.profileId !== person.profileId)
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          @{person.name}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="relative block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Caption (optional)
                  {allowsCollaborators
                    ? communityId
                      ? ' · @tag members'
                      : ' · @tag people you follow'
                    : ''}
                </span>
                <textarea
                  ref={captionRef}
                  value={caption}
                  onChange={(event) => {
                    const value = event.target.value.slice(0, 300);
                    setCaption(value);
                    if (allowsCollaborators) {
                      detectMention(value, event.target.selectionStart);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (!allowsCollaborators) return;
                    const target = event.currentTarget;
                    detectMention(target.value, target.selectionStart);
                  }}
                  maxLength={300}
                  rows={2}
                  placeholder={
                    kind === 'story'
                      ? 'Add a caption to your story…'
                      : 'Write a caption… use @ to tag people you follow'
                  }
                  className="w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                {mentionSuggestions.length > 0 && caption.includes('@') ? (
                  <ul className="absolute left-0 right-0 z-20 mt-1 max-h-44 overflow-y-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-float)]">
                    {mentionSuggestions.map((person) => (
                      <li key={person.profileId}>
                        <button
                          type="button"
                          className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                          onClick={() => addCollaborator(person)}
                        >
                          @{person.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {caption.length}/300
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                  onClick={() => setTextMode(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={uploadMutation.isPending || !text.trim()}
                  onClick={() => uploadMutation.mutate()}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sharing…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {kind === 'story' && !communityId
                        ? 'Share story'
                        : kind === 'both'
                          ? 'Share both'
                          : 'Share post'}
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : items.length === 0 ? (
            <>
              <button
                type="button"
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  handleFileList(event.dataTransfer.files, 'drop');
                }}
                onClick={() => dropInputRef.current?.click()}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors',
                  dragOver
                    ? 'border-primary bg-primary-soft/60'
                    : 'border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary/70'
                )}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Drag & drop photo or video
                </span>
                <span className="text-xs text-muted-foreground">
                  or click to browse · images & MP4/MOV
                </span>
              </button>

              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-primary-soft/50 px-2 py-5 text-center transition-colors hover:bg-primary-soft"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Camera className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center transition-colors hover:bg-secondary"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {kind !== 'story' ? 'Photos' : 'Photo'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center transition-colors hover:bg-secondary"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                    <Video className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    setTextMode(true);
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center transition-colors hover:bg-secondary"
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ background: textCardGradient(TEXT_CARD_BACKGROUNDS[0]) }}
                  >
                    <Type className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Text</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div
                  className={cn(
                    'grid gap-2',
                    items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  )}
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="relative overflow-hidden rounded-2xl border border-border bg-black"
                    >
                      {item.mediaType === 'video' ? (
                        <video
                          src={resolveMediaUrl(item.previewUrl)}
                          controls
                          playsInline
                          className="mx-auto max-h-64 w-full object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(item.previewUrl)}
                          alt="Preview"
                          className="mx-auto max-h-64 w-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        disabled={uploadMutation.isPending}
                        onClick={() => removeItem(item.id)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {canAddMoreImages ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Add more photos ({items.length}/{MAX_POST_IMAGES})
                  </button>
                ) : null}
              </div>

              <div className="relative block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Caption (optional)
                  {allowsCollaborators
                    ? communityId
                      ? ' · @tag members'
                      : ' · @tag people you follow'
                    : ''}
                </span>
                <textarea
                  ref={captionRef}
                  value={caption}
                  onChange={(event) => {
                    const value = event.target.value.slice(0, 300);
                    setCaption(value);
                    if (allowsCollaborators) {
                      detectMention(value, event.target.selectionStart);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (!allowsCollaborators) return;
                    const target = event.currentTarget;
                    detectMention(target.value, target.selectionStart);
                  }}
                  maxLength={300}
                  rows={2}
                  placeholder={
                    kind === 'story'
                      ? 'Add to your story…'
                      : 'Write a caption… use @ to tag people you follow'
                  }
                  className="w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                {mentionSuggestions.length > 0 ? (
                  <ul className="absolute left-0 right-0 z-20 mt-1 max-h-44 overflow-y-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-float)]">
                    {mentionSuggestions.map((person) => (
                      <li key={person.profileId}>
                        <button
                          type="button"
                          className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                          onClick={() => addCollaborator(person)}
                        >
                          @{person.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {caption.length}/300
                </p>
                {collaborators.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {collaborators.map((person) => (
                      <button
                        key={person.profileId}
                        type="button"
                        onClick={() =>
                          setCollaborators((prev) =>
                            prev.filter((c) => c.profileId !== person.profileId)
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        @{person.name}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                  onClick={clearItems}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sharing…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {kind === 'story'
                        ? 'Share story'
                        : kind === 'both'
                          ? 'Share both'
                          : 'Share post'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <input
          ref={dropInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm,video/*"
          multiple={kind !== 'story'}
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'drop');
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
            handleFileList(event.target.files, 'camera');
            event.target.value = '';
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple={kind !== 'story'}
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'image');
            event.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'video');
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
