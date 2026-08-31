'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell, { authButtonClass, authFieldClass } from '@/components/layout/AuthShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { OtpTimerResend } from '@/components/auth/OtpTimerResend';
import { useOtpCountdown } from '@/lib/hooks/useOtpCountdown';
import { cn } from '@/lib/utils';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAccessToken, setProfiles, setSelectedProfile } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');

  useEffect(() => {
    const phone = searchParams.get('phone');
    const country = searchParams.get('country');
    if (phone && country) {
      setPhoneNumber(phone);
      setCountryCode(decodeURIComponent(country));
    } else {
      router.push('/register');
    }
  }, [searchParams, router]);

  const otpActive = Boolean(phoneNumber && countryCode);
  const { secondsLeft, canResend, restartTimer } = useOtpCountdown(
    phoneNumber,
    countryCode,
    otpActive
  );

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await authAPI.verifyOTP({
        phoneNumber,
        countryCode,
        otp: otpCode,
      });

      const { user, profiles, accessToken } = response.data.data;
      setUser(user);
      setProfiles(profiles);
      setAccessToken(accessToken);

      // Axios attaches ?profile= from selectedProfile — must set before create-plan APIs run.
      const list = Array.isArray(profiles) ? profiles : [];
      const primary =
        list.find(
          (p) => p?.type === 'primary' || p?.relationship === 'self'
        ) || list[0];
      if (primary) {
        setSelectedProfile(primary);
      }

      router.push('/get-started');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'OTP verification failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || resending) return;

    setResending(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await authAPI.resendRegistrationOTP({
        phoneNumber,
        countryCode,
      });
      const expiresIn = response.data.data?.otpExpiresInSeconds;
      restartTimer(expiresIn);
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
      setSuccessMessage('A new OTP has been sent on WhatsApp.');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to resend OTP'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Enter confirmation code"
      subtitle={`Enter the 6-digit code sent to ${countryCode} ${phoneNumber} on WhatsApp.`}
      footer={
        <button
          type="button"
          onClick={() => router.push('/register')}
          className="font-semibold text-foreground"
        >
          Back to sign up
        </button>
      }
    >
      <form onSubmit={handleVerify} className="space-y-3">
        <div className="flex justify-center gap-1.5">
          {otp.map((digit, index) => (
            <Input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={cn(
                authFieldClass,
                'h-11 w-9 shrink-0 px-0 text-center text-base font-semibold'
              )}
              autoFocus={index === 0}
            />
          ))}
        </div>

        <OtpTimerResend
          secondsLeft={secondsLeft}
          canResend={canResend}
          onResend={handleResendOTP}
          resending={resending}
        />

        {successMessage ? (
          <p className="text-center text-xs font-medium text-success">{successMessage}</p>
        ) : null}

        {error ? (
          <p className="text-center text-xs font-medium text-destructive">{error}</p>
        ) : null}

        <Button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Verifying…' : 'Confirm'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen label="Loading…" />}>
      <VerifyOTPContent />
    </Suspense>
  );
}
