'use client';

import { Loader2 } from 'lucide-react';
import { formatOtpCountdown } from '@/lib/auth/otpSession';
import { cn } from '@/lib/utils';

interface OtpTimerResendProps {
  secondsLeft: number;
  canResend: boolean;
  onResend: () => void | Promise<void>;
  resending?: boolean;
  className?: string;
}

export function OtpTimerResend({
  secondsLeft,
  canResend,
  onResend,
  resending = false,
  className,
}: OtpTimerResendProps) {
  return (
    <div className={cn('text-center', className)}>
      {canResend ? (
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={resending}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {resending && <Loader2 className="h-4 w-4 animate-spin" />}
          Resend OTP
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">
          OTP expires in{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {formatOtpCountdown(secondsLeft)}
          </span>
        </p>
      )}
      {!canResend && (
        <p className="mt-1 text-xs text-muted-foreground">
          You can request a new code after the timer ends.
        </p>
      )}
    </div>
  );
}
