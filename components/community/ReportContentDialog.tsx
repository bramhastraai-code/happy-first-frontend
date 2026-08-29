'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { communityAPI } from '@/lib/api/community';
import { cn } from '@/lib/utils';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate or discrimination' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
] as const;

interface ReportContentDialogProps {
  open: boolean;
  targetType: 'community_message' | 'feed_comment';
  targetId: string;
  onClose: () => void;
  onReported?: () => void;
}

export function ReportContentDialog({
  open,
  targetType,
  targetId,
  onClose,
  onReported,
}: ReportContentDialogProps) {
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('spam');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await communityAPI.reportContent({
        targetType,
        targetId,
        reason,
        note: note.trim() || undefined,
      });
      setDone(true);
      onReported?.();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not submit report'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-float)]">
        <div className="mb-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Report content</h2>
        </div>

        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Thanks — moderators will review this report.
            </p>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Flag spam, abuse, or other rule-breaking content. False reports may be ignored.
            </p>
            <div className="space-y-1.5">
              {REASONS.map((row) => (
                <button
                  key={row.value}
                  type="button"
                  onClick={() => setReason(row.value)}
                  className={cn(
                    'flex w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    reason === row.value
                      ? 'border-primary bg-primary-soft font-semibold text-foreground'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
                  )}
                >
                  {row.label}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Optional details"
              className="w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={loading} onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={loading} onClick={() => void submit()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
