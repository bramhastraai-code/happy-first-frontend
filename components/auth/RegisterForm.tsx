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
import AuthShell, { authButtonClass, authFieldClass, authLinkClass } from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import { AuthFieldLabel } from '@/components/auth/AuthFieldLabel';
import { CountrySearchSelect } from '@/components/auth/CountrySearchSelect';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import {
  getPasswordStrength,
  validateDateOfBirth,
  validatePassword,
  validatePhone,
  validateUsername,
} from '@/components/auth/registerValidation';
import { markOtpSession } from '@/lib/auth/otpSession';
import { buildForgotPasswordHref, isExistingAccountError } from '@/lib/auth/forgotPassword';
import { cn } from '@/lib/utils';
import { detectBrowserTimezone } from '@/lib/utils/timezones';
import { timezoneForCountry } from '@/lib/utils/countries';
import { INDIAN_STATES, isIndia } from '@/lib/utils/indianStates';
import { setPendingCommunityId } from '@/lib/utils/pendingCommunity';
import { CustomDropdown } from '@/components/ui/CustomDropdown';

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
    username: '',
    email: '',
    password: '',
    country: 'India',
    city: '',
    state: '',
    area: '',
    locationPin: '',
    dateOfBirth: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    referredBy: '',
    timezone: detectBrowserTimezone(),
  });
  const [timezoneTouched, setTimezoneTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>(
    'idle'
  );
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

  useEffect(() => {
    const value = formData.username.trim().toLowerCase();
    const formatError = validateUsername(value);
    if (formatError) {
      setUsernameStatus('idle');
      return;
    }
    const timer = window.setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const res = await authAPI.checkUsername(value);
        setUsernameStatus(res.data.data.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [formData.username]);

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

    const usernameError = validateUsername(formData.username);
    if (usernameError) errors.username = usernameError;
    else if (usernameStatus === 'taken') errors.username = 'This username is already taken';

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    const dobError = validateDateOfBirth(formData.dateOfBirth);
    if (dobError) errors.dateOfBirth = dobError;

    if (!formData.gender) errors.gender = 'Select a gender';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.area.trim()) errors.area = 'Area is required';
    if (isIndia(formData.country) && formData.locationPin && !/^\d{6}$/.test(formData.locationPin)) {
      errors.locationPin = 'Enter a valid 6-digit pincode';
    }

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
      const username = formData.username.trim().toLowerCase();
      const response = await authAPI.register({
        ...formData,
        username,
        name: formData.name.trim() || username,
        city: formData.state,
        timezone: formData.timezone || detectBrowserTimezone(),
      });
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
          <Link href="/login" className={authLinkClass}>
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

            <p className="pt-2 text-center text-[11px] leading-snug text-[#737373]">
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
                className="shrink-0 font-semibold text-[#00376b]"
                disabled={loading}
              >
                Edit
              </button>
            </div>

            <div>
              <AuthFieldLabel htmlFor="username" required>
                Username
              </AuthFieldLabel>
              <Input
                id="username"
                className={cn(authFieldClass, fieldErrorClass('username'))}
                type="text"
                placeholder="Choose a unique username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={(e) => {
                  clearFieldError('username');
                  setFormData({
                    ...formData,
                    username: e.target.value.replace(/\s/g, '').slice(0, 20),
                  });
                }}
                required
                disabled={loading}
              />
              {usernameStatus === 'checking' ? (
                <p className="mt-1 text-[11px] text-neutral-500">Checking availability…</p>
              ) : usernameStatus === 'available' && !fieldErrors.username ? (
                <p className="mt-1 text-[11px] font-medium text-success">Username is available</p>
              ) : (
                <FieldError message={fieldErrors.username} />
              )}
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
                All age groups are welcome.
              </p>
              <FieldError message={fieldErrors.dateOfBirth} />
            </div>

            <div>
              <AuthFieldLabel required>Gender</AuthFieldLabel>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {([
                  ['male', 'Male'],
                  ['female', 'Female'],
                  ['other', 'Other'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      clearFieldError('gender');
                      setFormData({ ...formData, gender: value });
                    }}
                    className={cn(
                      'h-[38px] rounded-[3px] border text-xs font-semibold',
                      formData.gender === value
                        ? 'border-primary bg-primary-soft text-foreground'
                        : 'border-[#dbdbdb] bg-[#fafafa] text-neutral-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <FieldError message={fieldErrors.gender} />
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
                    state: isIndia(country) ? prev.state : prev.state,
                    ...(!timezoneTouched && tz ? { timezone: tz } : {}),
                  }));
                }}
                className={fieldErrorClass('country')}
                disabled={loading}
                required
              />
              <FieldError message={fieldErrors.country} />
            </div>

            <div>
              <AuthFieldLabel htmlFor="state" required>
                State
              </AuthFieldLabel>
              {isIndia(formData.country) ? (
                <CustomDropdown
                  id="state"
                  value={formData.state}
                  onChange={(state) => {
                    clearFieldError('state');
                    setFormData({ ...formData, state });
                  }}
                  placeholder="Select state"
                  searchable
                  searchPlaceholder="Search state…"
                  emptyMessage="No states found"
                  variant="auth"
                  options={INDIAN_STATES.map((state) => ({ value: state, label: state }))}
                  disabled={loading}
                  triggerClassName={fieldErrorClass('state')}
                  aria-label="State"
                />
              ) : (
                <Input
                  id="state"
                  className={cn(authFieldClass, fieldErrorClass('state'))}
                  type="text"
                  placeholder="State / region"
                  value={formData.state}
                  onChange={(e) => {
                    clearFieldError('state');
                    setFormData({ ...formData, state: e.target.value });
                  }}
                  required
                  disabled={loading}
                />
              )}
              <FieldError message={fieldErrors.state} />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <AuthFieldLabel htmlFor="area" required>
                  Area
                </AuthFieldLabel>
                <Input
                  id="area"
                  className={cn(authFieldClass, fieldErrorClass('area'))}
                  type="text"
                  placeholder="Area / locality"
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
              <div>
                <AuthFieldLabel htmlFor="locationPin" optional>
                  Pincode
                </AuthFieldLabel>
                <Input
                  id="locationPin"
                  className={cn(authFieldClass, fieldErrorClass('locationPin'))}
                  type="text"
                  inputMode="numeric"
                  placeholder="Pincode"
                  maxLength={6}
                  value={formData.locationPin}
                  onChange={(e) => {
                    clearFieldError('locationPin');
                    setFormData({
                      ...formData,
                      locationPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                    });
                  }}
                  disabled={loading}
                />
                <FieldError message={fieldErrors.locationPin} />
              </div>
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

            <Button type="submit" disabled={loading || usernameStatus === 'taken'} className={authButtonClass}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing up…
                </>
              ) : (
                'Sign up'
              )}
            </Button>

            <p className="pt-2 text-center text-[11px] leading-snug text-[#737373]">
              By signing up, you agree to receive WhatsApp messages for OTP and reminders from{' '}
              {BRAND_NAME}.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
