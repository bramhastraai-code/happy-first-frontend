'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { performLogout } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell, { AuthOrDivider, authButtonClass, authFieldClass } from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import { OtpTimerResend } from '@/components/auth/OtpTimerResend';
import { useOtpCountdown } from '@/lib/hooks/useOtpCountdown';
import { markOtpSession, DEFAULT_OTP_EXPIRY_MINUTES } from '@/lib/auth/otpSession';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';

function ValidationItem({ text, isValid }: { text: string; isValid: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {isValid ? (
        <CheckCircle className="h-3.5 w-3.5 text-primary" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border" />
      )}
      <span className={cn('text-xs', isValid ? 'text-foreground' : 'text-muted-foreground')}>
        {text}
      </span>
    </div>
  );
}

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otpSent, setOtpSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    countryCode: '+91',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    const phone = (searchParams.get('phone') || '').replace(/\D/g, '').slice(0, 10);
    const country = searchParams.get('country') || searchParams.get('countryCode') || '';
    const fromRegister = searchParams.get('from') === 'register';
    if (!phone && !country && !fromRegister) return;
    setFormData((prev) => ({
      ...prev,
      ...(phone ? { phoneNumber: phone } : {}),
      ...(country ? { countryCode: country.startsWith('+') ? country : `+${country}` } : {}),
    }));
    if (fromRegister || phone) {
      setInfoMessage(
        'This number is already registered. Verify with OTP to reset your password and sign in.'
      );
    }
  }, [searchParams]);

  const { secondsLeft, canResend, restartTimer } = useOtpCountdown(
    formData.phoneNumber,
    formData.countryCode,
    otpSent
  );

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleNewPasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, newPassword: value }));
    setValidations({
      minLength: value.length >= 8,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
    resetMessages();
  };

  const validateResetForm = () => {
    if (formData.otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return false;
    }
    if (!Object.values(validations).every(Boolean)) {
      setError('Please meet all password requirements');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      const response = await authAPI.requestForgotPasswordOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      const expiresIn = response.data.data?.otpExpiresInSeconds;
      markOtpSession(formData.phoneNumber, formData.countryCode, expiresIn);
      restartTimer(expiresIn);
      setOtpSent(true);
      setInfoMessage('');
      setSuccessMessage(
        `OTP sent to your WhatsApp. It is valid for ${DEFAULT_OTP_EXPIRY_MINUTES} minutes.`
      );
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to send OTP'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateResetForm()) return;

    setLoading(true);
    resetMessages();

    try {
      await authAPI.resetPasswordWithOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      await performLogout();
      setResetComplete(true);
      setSuccessMessage('Your password has been reset. You can now sign in with your new password.');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to reset password'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resendingOtp) return;

    setResendingOtp(true);
    resetMessages();

    try {
      const response = await authAPI.requestForgotPasswordOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      const expiresIn = response.data.data?.otpExpiresInSeconds;
      restartTimer(expiresIn);
      setFormData((prev) => ({ ...prev, otp: '' }));
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

  const allValidationsPassed = Object.values(validations).every(Boolean);
  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.newPassword === formData.confirmPassword;

  const lockIcon = (
    <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border-2 border-[#262626]">
      <Lock className="h-10 w-10 text-[#262626]" strokeWidth={1.25} />
    </div>
  );

  const backToLogin = (
    <Link href="/login" className="font-semibold text-[#262626]">
      Back to login
    </Link>
  );

  if (resetComplete) {
    return (
      <AuthShell
        hideLogo
        icon={<CheckCircle className="h-16 w-16 text-success" strokeWidth={1.4} />}
        title="Password updated"
        subtitle="You can now log in with your new password."
        footer={backToLogin}
      >
        <Button className={authButtonClass} onClick={() => router.push('/login')}>
          Log in
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      hideLogo
      icon={lockIcon}
      title="Trouble logging in?"
      subtitle="Enter your phone number and we'll send you an OTP to get back into your account."
      footer={backToLogin}
    >
      <form
        onSubmit={otpSent ? handleResetPassword : handleRequestOTP}
        className="space-y-1.5"
      >
        {infoMessage ? (
          <p className="pb-1 text-center text-xs text-neutral-500">{infoMessage}</p>
        ) : null}

        <div className="flex gap-1.5">
          <CountryCodeSelect
            id="countryCode"
            value={formData.countryCode}
            onChange={(countryCode) => {
              setFormData((prev) => ({ ...prev, countryCode }));
              resetMessages();
            }}
            disabled={otpSent || loading}
            compact
            dialOnly
            className="w-[6.75rem] shrink-0"
          />
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            placeholder="Phone number"
            aria-label="Phone number"
            value={formData.phoneNumber}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
              }));
              resetMessages();
            }}
            required
            disabled={otpSent || loading}
            className={authFieldClass}
          />
        </div>

        {otpSent && (
          <>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              aria-label="One-time password"
              value={formData.otp}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                }))
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
                resending={resendingOtp}
                onResend={handleResendOtp}
              />
            </div>

            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                placeholder="New password"
                aria-label="New password"
                value={formData.newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                required
                disabled={loading}
                className={cn(authFieldClass, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
                aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {formData.newPassword ? (
              <div className="space-y-1 py-1">
                <ValidationItem text="At least 8 characters" isValid={validations.minLength} />
                <ValidationItem text="One uppercase letter" isValid={validations.hasUpperCase} />
                <ValidationItem text="One lowercase letter" isValid={validations.hasLowerCase} />
                <ValidationItem text="One number" isValid={validations.hasNumber} />
                <ValidationItem text="One special character" isValid={validations.hasSpecialChar} />
              </div>
            ) : null}

            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                aria-label="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  resetMessages();
                }}
                required
                disabled={loading}
                className={cn(authFieldClass, 'pr-10')}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
                aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formData.confirmPassword && !passwordsMatch ? (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Passwords do not match
              </p>
            ) : null}
          </>
        )}

        {error ? (
          <p className="pt-1 text-center text-xs font-medium text-destructive">{error}</p>
        ) : null}
        {successMessage ? (
          <p className="pt-1 text-center text-xs font-medium text-success">{successMessage}</p>
        ) : null}

        <Button
          type="submit"
          className={authButtonClass}
          disabled={
            loading ||
            (otpSent && (!allValidationsPassed || !passwordsMatch || formData.otp.length !== 6))
          }
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {otpSent ? 'Resetting…' : 'Sending OTP…'}
            </>
          ) : otpSent ? (
            'Reset password'
          ) : (
            'Send OTP'
          )}
        </Button>

        {!otpSent ? (
          <>
            <AuthOrDivider />
            <p className="text-center text-sm font-semibold">
              <Link href="/register" className="text-[#262626]">
                Create new account
              </Link>
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setFormData((prev) => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen label="Loading…" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
