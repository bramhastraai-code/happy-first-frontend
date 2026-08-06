'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const DELETE_PROFILE_CONFIRMATION = 'delete profile';

interface DeleteAccountDialogProps {
  open: boolean;
  loading?: boolean;
  error?: string;
  onConfirm: (confirmation: string) => void;
  onCancel: () => void;
}

export function DeleteAccountDialog({
  open,
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmation('');
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open || !mounted) return null;

  const canDelete = confirmation.trim() === DELETE_PROFILE_CONFIRMATION;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-end justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={loading ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-float)]"
      >
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 id="delete-account-title" className="text-base font-semibold text-foreground">
          Delete account
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This permanently deactivates your account and all family profiles. You will be signed
          out and cannot sign in again with this account.
        </p>
        <p className="mt-3 text-sm text-foreground">
          Type{' '}
          <span className="font-mono font-semibold text-destructive">
            {DELETE_PROFILE_CONFIRMATION}
          </span>{' '}
          to confirm.
        </p>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={DELETE_PROFILE_CONFIRMATION}
          disabled={loading}
          autoComplete="off"
          className="mt-3"
          aria-label={`Type ${DELETE_PROFILE_CONFIRMATION} to confirm`}
        />
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || !canDelete}
            onClick={() => onConfirm(confirmation.trim())}
            className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {loading ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
