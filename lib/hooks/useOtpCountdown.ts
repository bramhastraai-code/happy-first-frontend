'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_OTP_EXPIRY_SECONDS,
  getOtpSecondsLeft,
  markOtpSession,
} from '@/lib/auth/otpSession';

export function useOtpCountdown(
  phoneNumber: string,
  countryCode: string,
  active: boolean
) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const syncTimer = useCallback(() => {
    if (!phoneNumber || !countryCode) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(getOtpSecondsLeft(phoneNumber, countryCode));
  }, [phoneNumber, countryCode]);

  const restartTimer = useCallback(
    (expiresInSeconds = DEFAULT_OTP_EXPIRY_SECONDS) => {
      if (!phoneNumber || !countryCode) return;
      markOtpSession(phoneNumber, countryCode, expiresInSeconds);
      setSecondsLeft(expiresInSeconds);
    },
    [phoneNumber, countryCode]
  );

  useEffect(() => {
    if (!active || !phoneNumber || !countryCode) {
      setSecondsLeft(0);
      return;
    }

    if (getOtpSecondsLeft(phoneNumber, countryCode) === 0) {
      markOtpSession(phoneNumber, countryCode);
    }

    syncTimer();
    const intervalId = window.setInterval(syncTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [active, phoneNumber, countryCode, syncTimer]);

  return {
    secondsLeft,
    canResend: secondsLeft <= 0,
    restartTimer,
  };
}
