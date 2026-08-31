'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell, { authButtonClass, authFieldClass } from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { OtpTimerResend } from '@/components/auth/OtpTimerResend';
import { useOtpCountdown } from '@/lib/hooks/useOtpCountdown';
import { markOtpSession, DEFAULT_OTP_EXPIRY_MINUTES } from '@/lib/auth/otpSession';
import { buildForgotPasswordHref } from '@/lib/auth/forgotPassword';

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
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed';
      if (/verify your (WhatsApp )?OTP/i.test(message)) {
        try {
          const resend = await authAPI.resendRegistrationOTP({
            phoneNumber: formData.phoneNumber,
            countryCode: formData.countryCode,
          });
          markOtpSession(
            formData.phoneNumber,
            formData.countryCode,
            resend.data.data?.otpExpiresInSeconds
          );
        } catch {
          // Still send them to verify; they can request a new code there.
        }
        router.push(
          `/verify-otp?phone=${formData.phoneNumber}&country=${encodeURIComponent(formData.countryCode)}`
        );
        return;
      }
      setError(message);
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
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send OTP';
      if (/verify your (WhatsApp )?OTP/i.test(message)) {
        try {
          const resend = await authAPI.resendRegistrationOTP({
            phoneNumber: formData.phoneNumber,
            countryCode: formData.countryCode,
          });
          markOtpSession(
            formData.phoneNumber,
            formData.countryCode,
            resend.data.data?.otpExpiresInSeconds
          );
        } catch {
          // Continue to verify page.
        }
        router.push(
          `/verify-otp?phone=${formData.phoneNumber}&country=${encodeURIComponent(formData.countryCode)}`
        );
        return;
      }
      setError(message);
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
      ? 'Log in'
      : loginMethod === 'otp'
      ? otpSent
        ? 'Verify OTP'
        : 'Send OTP'
      : magicLinkSent
      ? 'Magic link sent'
      : 'Send magic link';

  return (
    <AuthShell
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-primary">
            Sign up
          </Link>
        </>
      }
    >
      <div className="mb-4 flex gap-0 border-b border-[#dbdbdb] text-center text-xs font-semibold">
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
              '-mb-px flex-1 border-b-2 py-2.5 transition-colors',
              loginMethod === method.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-neutral-400'
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
        className="space-y-1.5"
      >
        <div className="flex gap-1.5">
          <CountryCodeSelect
            id="countryCode"
            value={formData.countryCode}
            onChange={(countryCode) => setFormData({ ...formData, countryCode })}
            disabled={phoneLocked || loading}
            compact
            dialOnly
            className="w-[6.75rem] shrink-0"
          />
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="Phone number"
            maxLength={10}
            inputMode="numeric"
            autoComplete="tel"
            aria-label="Phone number"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            required
            disabled={phoneLocked || loading}
            className={authFieldClass}
          />
        </div>

        {loginMethod === 'password' && (
          <Input
            id="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            aria-label="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={loading}
            className={authFieldClass}
          />
        )}

        {loginMethod === 'otp' && otpSent && (
          <>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              aria-label="One-time password"
              value={formData.otp}
              onChange={(e) =>
                setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })
              }
              maxLength={6}
              required
              disabled={loading}
              className={authFieldClass}
            />
            <div className="pt-1">
              <OtpTimerResend
                secondsLeft={secondsLeft}
                canResend={canResend}
                onResend={handleResendLoginOtp}
                resending={resendingOtp}
              />
            </div>
          </>
        )}

        {successMessage && (
          <p className="pt-1 text-center text-xs font-medium text-success">{successMessage}</p>
        )}

        {error && (
          <p className="pt-1 text-center text-xs font-medium text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading || (magicLinkSent && loginMethod === 'magicLink')}
          className={authButtonClass}
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

        {loginMethod === 'password' ? (
          <p className="pt-3 text-center">
            <Link
              href={buildForgotPasswordHref(formData.phoneNumber, formData.countryCode)}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              Forgot password?
            </Link>
          </p>
        ) : null}

        {loginMethod === 'otp' && otpSent && (
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setFormData({ ...formData, otp: '' });
              resetMessages();
            }}
            className="w-full pt-2 text-center text-xs font-medium text-primary"
          >
            Use a different number
          </button>
        )}
      </form>
    </AuthShell>
  );
}
