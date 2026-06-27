'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { performLogout } from '@/lib/auth/session';

export function useLogoutConfirm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestLogout = useCallback(() => {
    setOpen(true);
  }, []);

  const cancelLogout = useCallback(() => {
    if (!loading) setOpen(false);
  }, [loading]);

  const confirmLogout = useCallback(async () => {
    setLoading(true);
    try {
      await performLogout();
      router.push('/login');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [router]);

  const LogoutConfirmDialog = (
    <ConfirmDialog
      open={open}
      title="Log out?"
      description="You will need to sign in again to access your profile, tasks, and weekly plan."
      confirmLabel="Yes, log out"
      cancelLabel="No, stay"
      loading={loading}
      onConfirm={() => void confirmLogout()}
      onCancel={cancelLogout}
    />
  );

  return { requestLogout, LogoutConfirmDialog };
}
