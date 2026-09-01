'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Gift, Loader2 } from 'lucide-react';
import { BRAND_NAME } from '@/lib/brand';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthShell, { authButtonClass, authFieldClass } from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import { AuthFieldLabel } from '@/components/auth/AuthFieldLabel';
import { CountrySearchSelect } from '@/components/auth/CountrySearchSelect';
import { TimezoneGroupedSelect } from '@/components/auth/TimezoneGroupedSelect';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import {
  getPasswordStrength,
  validateDateOfBirth,
  validatePassword,
  validatePhone,
} from '@/components/auth/registerValidation';
import { markOtpSession } from '@/lib/auth/otpSession';
import { buildForgotPasswordHref, isExistingAccountError } from '@/lib/auth/forgotPassword';
import { cn } from '@/lib/utils';
import { detectBrowserTimezone } from '@/lib/utils/timezones';
import { timezoneForCountry } from '@/lib/utils/countries';
import { setPendingCommunityId } from '@/lib/utils/pendingCommunity';

const labelClassName = 'sr-only';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'phone' | 'details'>('phone');
  const [formData, setFormData] = useState({
    phoneNumber: '',
    countryCode: '+91',
    name: '',
    email: '',
    password: '',
    country: 'India',
    city: '',
    area: '',
    dateOfBirth: '',
    referredBy: '',
    timezone: detectBrowserTimezone(),
  });
  const [timezoneTouched, setTimezoneTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const communityId = searchParams.get('community');
    const inviterProfileId = searchParams.get('invitedBy');
    if (communityId) {
      setPendingCommunityId(communityId, inviterProfileId);
    }

    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData((prev) => ({ ...prev, referredBy: refCode }));
      setIsReferralLocked(true);
      return;
    }
    setIsReferralLocked(false);
  }, [searchParams]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const phoneValid = validatePhone(formData.phoneNumber) === null;

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const goToPhoneStep = () => {
    setStep('phone');
    setError('');
    setFieldErrors({});
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneError = validatePhone(formData.phoneNumber);
    if (phoneError) {
      setError(phoneError);
      setFieldErrors({ phoneNumber: phoneError });
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await authAPI.checkPhone({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      const status = response.data.data;
      if (status?.exists) {
        router.replace(
          buildForgotPasswordHref(formData.phoneNumber, formData.countryCode, {
            fromRegister: true,
          })
        );
        return;
      }
      setStep('details');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not verify this number. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateDetails = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    const dobError = validateDateOfBirth(formData.dateOfBirth);
    if (dobError) errors.dateOfBirth = dobError;

    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.area.trim()) errors.area = 'Area is required';
    if (!formData.timezone.trim()) errors.timezone = 'Timezone is required';

    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateDetails();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the highlighted fields.');
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await authAPI.register(formData);
      markOtpSession(
        formData.phoneNumber,
        formData.countryCode,
        response.data.data?.otpExpiresInSeconds
      );
      router.push(
        `/verify-otp?phone=${formData.phoneNumber}&country=${encodeURIComponent(formData.countryCode)}`
      );
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      if (isExistingAccountError(message)) {
        router.replace(
          buildForgotPasswordHref(formData.phoneNumber, formData.countryCode, {
            fromRegister: true,
          })
        );
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fieldErrorClass = (field: string) =>
    fieldErrors[field] ? 'border-destructive focus-visible:ring-destructive/30' : '';

  return (
    <AuthShell
      title={
        step === 'phone'
          ? 'Sign up to start your wellness journey.'
          : 'Complete your profile to get started.'
      }
      footer={
        <>
          Have an account?{' '}
          <Link href="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </>
      }
    >
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.form
            key="phone-step"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            onSubmit={handlePhoneSubmit}
            className="space-y-1.5"
          >
            <div className="flex gap-1.5">
              <CountryCodeSelect
                id="countryCode"
                value={formData.countryCode}
                onChange={(countryCode) => setFormData({ ...formData, countryCode })}
                compact
                dialOnly
                className="w-[6.75rem] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <AuthFieldLabel htmlFor="phoneNumber" required>
                  Phone number
                </AuthFieldLabel>
                <Input
                  id="phoneNumber"
                  className={cn(authFieldClass, fieldErrorClass('phoneNumber'))}
                  type="tel"
                  placeholder="Phone number"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    clearFieldError('phoneNumber');
                    setFormData({
                      ...formData,
                      phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                    });
                  }}
                  required
                />
                <FieldError message={fieldErrors.phoneNumber} />
              </div>
            </div>

            <div>
              <AuthFieldLabel htmlFor="referral" optional>
                Referral code
              </AuthFieldLabel>
              {isReferralLocked && formData.referredBy ? (
                <div className="flex items-center gap-2 rounded-[4px] border border-success/20 bg-success-soft px-2.5 py-2">
                  <Gift className="h-4 w-4 shrink-0 text-success" />
                  <p className="truncate text-xs font-semibold text-foreground">
                    Invite applied · {formData.referredBy}
                  </p>
                </div>
              ) : (
                <Input
                  id="referral"
                  type="text"
                  placeholder="Referral code (optional)"
                  value={formData.referredBy}
                  onChange={(e) =>
                    setFormData({ ...formData, referredBy: e.target.value.trim() })
                  }
                  className={authFieldClass}
                />
              )}
            </div>

            {error && (
              <p role="alert" className="pt-1 text-center text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className={authButtonClass}
              disabled={!phoneValid || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                'Sign up'
              )}
            </Button>

            <p className="pt-2 text-center text-[11px] leading-snug text-neutral-400">
              By signing up, you agree to our terms. Already registered?{' '}
              <Link
                href={buildForgotPasswordHref(formData.phoneNumber, formData.countryCode)}
                className="font-semibold text-neutral-600"
              >
                Reset password
              </Link>
            </p>
          </motion.form>
        ) : (
          <motion.form
            key="details-step"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegister}
            className="space-y-1.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-500">
              <p className="truncate font-medium">
                {formData.countryCode} {formData.phoneNumber}
              </p>
              <button
                type="button"
                onClick={goToPhoneStep}
                className="shrink-0 font-semibold text-primary"
                disabled={loading}
              >
                Edit
              </button>
            </div>

            <div>
              <AuthFieldLabel htmlFor="name" required>
                Full name
              </AuthFieldLabel>
              <Input
                id="name"
                className={cn(authFieldClass, fieldErrorClass('name'))}
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={(e) => {
                  clearFieldError('name');
                  setFormData({ ...formData, name: e.target.value });
                }}
                required
                disabled={loading}
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div>
              <AuthFieldLabel htmlFor="email" required>
                Email
              </AuthFieldLabel>
              <Input
                id="email"
                className={cn(authFieldClass, fieldErrorClass('email'))}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => {
                  clearFieldError('email');
                  setFormData({ ...formData, email: e.target.value });
                }}
                required
                disabled={loading}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <AuthFieldLabel htmlFor="dateOfBirth" required>
                Birthday
              </AuthFieldLabel>
              <Input
                id="dateOfBirth"
                className={cn(authFieldClass, fieldErrorClass('dateOfBirth'))}
                type="date"
                aria-label="Your birthday"
                max={new Date().toISOString().slice(0, 10)}
                value={formData.dateOfBirth}
                onChange={(e) => {
                  clearFieldError('dateOfBirth');
                  setFormData({ ...formData, dateOfBirth: e.target.value });
                }}
                required
                disabled={loading}
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Used for age-appropriate recommendations. Must be 5 years or older.
              </p>
              <FieldError message={fieldErrors.dateOfBirth} />
            </div>

            <div>
              <AuthFieldLabel htmlFor="country" required>
                Country
              </AuthFieldLabel>
              <CountrySearchSelect
                id="country"
                value={formData.country}
                onChange={(country) => {
                  clearFieldError('country');
                  const tz = timezoneForCountry(country);
                  setFormData((prev) => ({
                    ...prev,
                    country,
                    ...(!timezoneTouched && tz ? { timezone: tz } : {}),
                  }));
                }}
                className={fieldErrorClass('country')}
                disabled={loading}
                required
              />
              <FieldError message={fieldErrors.country} />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <AuthFieldLabel htmlFor="city" required>
                  City
                </AuthFieldLabel>
                <Input
                  id="city"
                  className={cn(authFieldClass, fieldErrorClass('city'))}
                  type="text"
                  placeholder="City"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={(e) => {
                    clearFieldError('city');
                    setFormData({ ...formData, city: e.target.value });
                  }}
                  required
                  disabled={loading}
                />
                <FieldError message={fieldErrors.city} />
              </div>
              <div>
                <AuthFieldLabel htmlFor="area" required>
                  Area / locality
                </AuthFieldLabel>
                <Input
                  id="area"
                  className={cn(authFieldClass, fieldErrorClass('area'))}
                  type="text"
                  placeholder="Area"
                  autoComplete="address-level3"
                  value={formData.area}
                  onChange={(e) => {
                    clearFieldError('area');
                    setFormData({ ...formData, area: e.target.value });
                  }}
                  required
                  disabled={loading}
                />
                <FieldError message={fieldErrors.area} />
              </div>
            </div>

            <div>
              <AuthFieldLabel htmlFor="timezone" required>
                Timezone
              </AuthFieldLabel>
              <TimezoneGroupedSelect
                id="timezone"
                value={formData.timezone}
                onChange={(timezone) => {
                  clearFieldError('timezone');
                  setTimezoneTouched(true);
                  setFormData({ ...formData, timezone });
                }}
                className={fieldErrorClass('timezone')}
                disabled={loading}
                required
              />
              <FieldError message={fieldErrors.timezone} />
            </div>

            <div>
              <AuthFieldLabel htmlFor="password" required>
                Password
              </AuthFieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  className={cn(authFieldClass, 'pr-11', fieldErrorClass('password'))}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => {
                    clearFieldError('password');
                    setFormData({ ...formData, password: e.target.value });
                  }}
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <FieldError message={fieldErrors.password} />
              ) : (
                <PasswordStrengthMeter strength={passwordStrength} />
              )}
            </div>

            {error && (
              <p role="alert" className="pt-1 text-center text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className={authButtonClass}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing up…
                </>
              ) : (
                'Sign up'
              )}
            </Button>

            <p className="pt-2 text-center text-[11px] leading-snug text-neutral-400">
              By signing up, you agree to receive WhatsApp messages for OTP and reminders from{' '}
              {BRAND_NAME}.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
