'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell from '@/components/layout/AuthShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import RegisterStepper from '@/components/ui/RegisterStepper';
import { OtpTimerResend } from '@/components/auth/OtpTimerResend';
import { useOtpCountdown } from '@/lib/hooks/useOtpCountdown';
import { DEFAULT_OTP_EXPIRY_MINUTES } from '@/lib/auth/otpSession';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAccessToken, setProfiles } = useAuthStore();

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

      router.push('/create-plan?mode=first-setup');
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
      title="Verify your number"
      subtitle={`Enter the 6-digit code sent to ${countryCode} ${phoneNumber} on WhatsApp. Valid for ${DEFAULT_OTP_EXPIRY_MINUTES} minutes.`}
      headerExtra={<RegisterStepper step="verify" />}
    >
      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-center gap-2">
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
              className="h-12 w-11 text-center text-xl font-semibold"
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

        {successMessage && (
          <div className="rounded-xl bg-success-soft p-3 text-center text-sm font-medium text-success">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">{error}</div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Verifying…' : 'Verify OTP'}
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
