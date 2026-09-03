'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { Check, Loader2, Pencil, Plus, Smile, Trash2, X } from 'lucide-react';
import {
  MOOD_STICKER_COLORS,
  type MoodEmotionSticker,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
      Loading emojis…
    </div>
  ),
});

interface DailyMoodJournalStepProps {
  library: MoodEmotionSticker[];
  selectedIds: string[];
  busy: boolean;
  error: string;
  onToggle: (id: string) => void;
  onUpsertCustom: (sticker: MoodEmotionSticker) => void;
  onDeleteCustom: (id: string) => void;
}

type EditorState = {
  id: string;
  emoji: string;
  name: string;
  color: string;
  isNew: boolean;
};

export function DailyMoodJournalStep({
  library,
  selectedIds,
  busy,
  error,
  onToggle,
  onUpsertCustom,
  onDeleteCustom,
}: DailyMoodJournalStepProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const openNew = () => {
    setEditor({
      id: `custom-${Date.now()}`,
      emoji: '🙂',
      name: '',
      color: MOOD_STICKER_COLORS[6],
      isNew: true,
    });
    setShowPicker(false);
  };

  const openEdit = (sticker: MoodEmotionSticker) => {
    setEditor({
      id: sticker.id,
      emoji: sticker.emoji,
      name: sticker.name,
      color: sticker.color,
      isNew: false,
    });
    setShowPicker(false);
  };

  const saveEditor = () => {
    if (!editor) return;
    const name = editor.name.trim() || 'custom';
    onUpsertCustom({
      id: editor.id,
      emoji: editor.emoji || '🙂',
      name: name.slice(0, 24),
      color: editor.color,
      custom: true,
    });
    setEditor(null);
    setShowPicker(false);
  };

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Emoji
          </p>
          <span className="text-[11px] text-muted-foreground">{selectedIds.length}/8</span>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
          {library.map((sticker) => {
            const active = selectedIds.includes(sticker.id);
            return (
              <div key={sticker.id} className="relative flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggle(sticker.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl leading-none ring-2 ring-offset-2 ring-offset-surface transition-all',
                      active ? 'ring-foreground' : 'ring-transparent'
                    )}
                    style={{ backgroundColor: sticker.color }}
                  >
                    {sticker.emoji}
                  </span>
                  <span className="max-w-[4.5rem] truncate text-[11px] font-medium capitalize text-foreground">
                    {sticker.name}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(sticker)}
                  className="absolute -right-0.5 -top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground"
                  aria-label={`Customize ${sticker.name}`}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            disabled={busy}
            onClick={openNew}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border bg-secondary/50 text-muted-foreground">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">Add</span>
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {busy ? (
        <div className="flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : null}

      {editor && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Close"
                onClick={() => {
                  setEditor(null);
                  setShowPicker(false);
                }}
              />
              <div className="relative z-[1] max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-4 shadow-[var(--shadow-float)] sm:rounded-3xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {editor.isNew ? 'New emoji' : 'Customize emoji'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditor(null);
                      setShowPicker(false);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPicker((open) => !open)}
                    className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl ring-2 ring-border"
                    style={{ backgroundColor: editor.color }}
                    aria-label="Pick emoji"
                  >
                    {editor.emoji}
                  </button>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Name
                    </label>
                    <input
                      value={editor.name}
                      maxLength={24}
                      placeholder="Name this emoji"
                      onChange={(event) =>
                        setEditor((prev) =>
                          prev ? { ...prev, name: event.target.value.slice(0, 24) } : prev
                        )
                      }
                      className="h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPicker((open) => !open)}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 text-sm font-medium text-foreground"
                >
                  <Smile className="h-4 w-4 text-primary" />
                  {showPicker ? 'Hide emoji picker' : 'Choose emoji'}
                </button>

                {showPicker ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                    <EmojiPicker
                      width="100%"
                      height={280}
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(emojiData) => {
                        setEditor((prev) =>
                          prev ? { ...prev, emoji: emojiData.emoji } : prev
                        );
                        setShowPicker(false);
                      }}
                    />
                  </div>
                ) : null}

                <p className="mb-2 mt-4 text-[11px] font-medium text-muted-foreground">Color</p>
                <div className="flex flex-wrap gap-2">
                  {MOOD_STICKER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setEditor((prev) => (prev ? { ...prev, color } : prev))
                      }
                      className={cn(
                        'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface',
                        editor.color.toLowerCase() === color.toLowerCase()
                          ? 'ring-foreground'
                          : 'ring-transparent'
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  {!editor.isNew ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteCustom(editor.id);
                        setEditor(null);
                        setShowPicker(false);
                      }}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-destructive/30 px-4 text-sm font-semibold text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={saveEditor}
                    className="ml-auto inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                    Save emoji
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
