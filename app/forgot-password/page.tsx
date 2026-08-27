'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { performLogout } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import { OtpTimerResend } from '@/components/auth/OtpTimerResend';
import { useOtpCountdown } from '@/lib/hooks/useOtpCountdown';
import { markOtpSession, DEFAULT_OTP_EXPIRY_MINUTES } from '@/lib/auth/otpSession';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
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

  if (resetComplete) {
    return (
      <AuthShell
        title="Password reset"
        subtitle="You're all set to sign in again."
        footer={
          <>
            Remember your password?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="rounded-2xl bg-success-soft px-4 py-5 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-success" />
          <p className="text-sm font-medium text-success">{successMessage}</p>
          <Button className="mt-4 w-full" size="lg" onClick={() => router.push('/login')}>
            Go to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Verify your phone number with OTP and set a new password."
      footer={
        <>
          Remember your password?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={otpSent ? handleResetPassword : handleRequestOTP}
        className="space-y-4"
      >
        {infoMessage && (
          <div className="rounded-xl border border-primary/20 bg-primary-soft px-3 py-2.5 text-sm text-accent-foreground">
            {infoMessage}
          </div>
        )}

        <div>
          <label htmlFor="countryCode" className="mb-1.5 block text-sm font-medium text-foreground">
            Country code
          </label>
          <CountryCodeSelect
            id="countryCode"
            value={formData.countryCode}
            onChange={(countryCode) => {
              setFormData((prev) => ({ ...prev, countryCode }));
              resetMessages();
            }}
            disabled={otpSent || loading}
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-foreground">
            Phone number
          </label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
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
          />
        </div>

        {otpSent && (
          <>
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
                maxLength={6}
                required
                disabled={loading}
              />
              <div className="mt-3">
                <OtpTimerResend
                  secondsLeft={secondsLeft}
                  canResend={canResend}
                  resending={resendingOtp}
                  onResend={handleResendOtp}
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-foreground">
                New password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {formData.newPassword && (
              <div className="space-y-1.5 rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Requirements
                </p>
                <ValidationItem text="At least 8 characters" isValid={validations.minLength} />
                <ValidationItem text="One uppercase letter" isValid={validations.hasUpperCase} />
                <ValidationItem text="One lowercase letter" isValid={validations.hasLowerCase} />
                <ValidationItem text="One number" isValid={validations.hasNumber} />
                <ValidationItem text="One special character" isValid={validations.hasSpecialChar} />
              </div>
            )}

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                    resetMessages();
                  }}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Passwords do not match
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-sm text-accent-foreground">
            {successMessage}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={
            loading ||
            (otpSent && (!allValidationsPassed || !passwordsMatch || formData.otp.length !== 6))
          }
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {otpSent ? 'Resetting…' : 'Sending OTP…'}
            </>
          ) : otpSent ? (
            'Reset password'
          ) : (
            'Send reset OTP'
          )}
        </Button>
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
