'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import { messagesAPI, type FeedChatMessage } from '@/lib/api/messages';
import { cn } from '@/lib/utils';

interface DmCreatePollDialogProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onCreated: (message: FeedChatMessage) => void;
}

export function DmCreatePollDialog({
  open,
  conversationId,
  onClose,
  onCreated,
}: DmCreatePollDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleaned = options.map((o) => o.trim()).filter(Boolean);
      const closesAt =
        expiresInHours != null
          ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
          : undefined;
      const res = await messagesAPI.createPoll(conversationId, {
        question: question.trim(),
        options: cleaned,
        allowMultiple,
        anonymous,
        closesAt,
      });
      return res.data.data.message;
    },
    onSuccess: (message) => {
      onCreated(message);
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(false);
      setAnonymous(false);
      setExpiresInHours(null);
      setError(null);
      onClose();
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to create poll');
    },
  });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#111b21]">Create poll</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question"
            maxLength={300}
            className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="space-y-2">
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[index] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${index + 1}`}
                  maxLength={120}
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="text-xs text-[#667781]"
                    onClick={() => setOptions(options.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <button
                type="button"
                onClick={() => setOptions([...options, ''])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-[#111b21]">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
            />
            Allow multiple answers
          </label>
          <label className="flex items-center gap-2 text-sm text-[#111b21]">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Anonymous votes
          </label>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#54656f]">Closes after</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { label: 'No expiry', value: null },
                  { label: '1 hour', value: 1 },
                  { label: '24 hours', value: 24 },
                  { label: '7 days', value: 168 },
                ] as const
              ).map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setExpiresInHours(opt.value)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    expiresInHours === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            type="button"
            disabled={
              createMutation.isPending ||
              question.trim().length < 2 ||
              options.filter((o) => o.trim()).length < 2
            }
            onClick={() => createMutation.mutate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Post poll
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
