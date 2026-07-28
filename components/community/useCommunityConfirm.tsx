'use client';

import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface CommunityConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, confirm button uses destructive styling (default true). */
  destructive?: boolean;
  onConfirm: () => void | Promise<unknown>;
}

/**
 * Reusable destructive confirmation for the Community module.
 * Replaces browser alert()/confirm() for deletes and irreversible actions.
 */
export function useCommunityConfirm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CommunityConfirmOptions | null>(null);

  const requestConfirm = useCallback((next: CommunityConfirmOptions) => {
    setOptions(next);
    setOpen(true);
  }, []);

  const cancel = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setOptions(null);
  }, [loading]);

  const confirm = useCallback(async () => {
    if (!options?.onConfirm) return;
    setLoading(true);
    try {
      await options.onConfirm();
      setOpen(false);
      setOptions(null);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={open}
      title={options?.title || 'Are you sure?'}
      description={
        options?.description ||
        'This action cannot be undone. Please confirm you want to continue.'
      }
      confirmLabel={options?.confirmLabel || 'Delete'}
      cancelLabel={options?.cancelLabel || 'Cancel'}
      loading={loading}
      destructive={options?.destructive !== false}
      onConfirm={() => void confirm()}
      onCancel={cancel}
    />
  );

  return { requestConfirm, ConfirmDialogElement, confirmOpen: open, confirmLoading: loading };
}
