'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { OtpTimerResend } from '@/components/auth/OtpTimerResend';
import { useOtpCountdown } from '@/lib/hooks/useOtpCountdown';
import { markOtpSession, DEFAULT_OTP_EXPIRY_MINUTES } from '@/lib/auth/otpSession';

type LoginMethod = 'password' | 'otp' | 'magicLink';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setAccessToken, setProfiles } = useAuthStore();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    countryCode: '+91',
    password: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { secondsLeft, canResend, restartTimer } = useOtpCountdown(
    formData.phoneNumber,
    formData.countryCode,
    loginMethod === 'otp' && otpSent
  );

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
        password: formData.password,
      });
      const { user, accessToken, profiles } = response.data.data;
      setUser(user);
      setProfiles(profiles);
      setAccessToken(accessToken);
      router.push('/select-profile');
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      const response = await authAPI.requestLoginOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      const expiresIn = response.data.data?.otpExpiresInSeconds;
      markOtpSession(formData.phoneNumber, formData.countryCode, expiresIn);
      restartTimer(expiresIn);
      setOtpSent(true);
      setSuccessMessage(`OTP sent to your WhatsApp. It is valid for ${DEFAULT_OTP_EXPIRY_MINUTES} minutes.`);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyLoginOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
        otp: formData.otp,
      });
      const { user, profiles, accessToken } = response.data.data;
      setUser(user);
      setProfiles(profiles);
      setAccessToken(accessToken);
      router.push('/select-profile');
    } catch (err) {
      setSuccessMessage('');
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!canResend || resendingOtp) return;

    setResendingOtp(true);
    resetMessages();

    try {
      const response = await authAPI.requestLoginOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      const expiresIn = response.data.data?.otpExpiresInSeconds;
      restartTimer(expiresIn);
      setFormData({ ...formData, otp: '' });
      setSuccessMessage('A new OTP has been sent on WhatsApp.');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to resend OTP'
      );
    } finally {
      setResendingOtp(false);
    }
  };

  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      const response = await authAPI.requestMagicLink({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      setMagicLinkSent(true);
      const magicLink = response.data.data?.magicLink;
      setSuccessMessage(
        magicLink
          ? `Magic link sent. For testing: ${magicLink}`
          : 'Magic link sent to your phone.'
      );
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const methods: { id: LoginMethod; label: string }[] = [
    { id: 'password', label: 'Password' },
    { id: 'otp', label: 'OTP' },
  ];

  const phoneLocked = (otpSent && loginMethod === 'otp') || (magicLinkSent && loginMethod === 'magicLink');

  const submitLabel =
    loginMethod === 'password'
      ? 'Sign in'
      : loginMethod === 'otp'
      ? otpSent
        ? 'Verify OTP'
        : 'Send OTP'
      : magicLinkSent
      ? 'Magic link sent'
      : 'Send magic link';

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your wellness streak."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="mb-6 flex rounded-full bg-secondary p-1">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => {
              setLoginMethod(method.id);
              setOtpSent(false);
              setMagicLinkSent(false);
              resetMessages();
            }}
            className={cn(
              'flex-1 rounded-full py-2.5 text-sm font-semibold transition-all',
              loginMethod === method.id
                ? 'bg-surface text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {method.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={
          loginMethod === 'password'
            ? handlePasswordLogin
            : loginMethod === 'otp'
            ? otpSent
              ? handleVerifyOTP
              : handleRequestOTP
            : handleRequestMagicLink
        }
        className="space-y-4"
      >
        <div>
          <label htmlFor="countryCode" className="mb-1.5 block text-sm font-medium text-foreground">
            Country code
          </label>
          <CountryCodeSelect
            id="countryCode"
            value={formData.countryCode}
            onChange={(countryCode) => setFormData({ ...formData, countryCode })}
            disabled={phoneLocked || loading}
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-foreground">
            Phone number
          </label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="9999999999"
            maxLength={10}
            inputMode="numeric"
            autoComplete="tel"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            required
            disabled={phoneLocked || loading}
          />
        </div>

        {loginMethod === 'password' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
            />
          </div>
        )}

        {loginMethod === 'otp' && otpSent && (
          <div>
            <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-foreground">
              One-time password
            </label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="6-digit OTP"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              maxLength={6}
              required
              disabled={loading}
            />
            <div className="mt-3">
              <OtpTimerResend
                secondsLeft={secondsLeft}
                canResend={canResend}
                onResend={handleResendLoginOtp}
                resending={resendingOtp}
              />
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || (magicLinkSent && loginMethod === 'magicLink')}
          className="mt-2 w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait…
            </>
          ) : (
            submitLabel
          )}
        </Button>

        {loginMethod === 'otp' && otpSent && (
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setFormData({ ...formData, otp: '' });
              resetMessages();
            }}
            className="w-full pt-1 text-sm font-medium text-primary hover:underline"
          >
            Use a different number
          </button>
        )}
      </form>
    </AuthShell>
  );
}
