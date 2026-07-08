'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  UserRound,
} from 'lucide-react';
import { BRAND_NAME } from '@/lib/brand';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/authStore';
import AuthShell from '@/components/layout/AuthShell';
import CountryCodeSelect from '@/components/ui/CountryCodeSelect';
import RegisterStepper from '@/components/ui/RegisterStepper';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import {
  getPasswordStrength,
  validateDateOfBirth,
  validatePassword,
  validatePhone,
  validatePinCode,
} from '@/components/auth/registerValidation';
import { markOtpSession } from '@/lib/auth/otpSession';
import { cn } from '@/lib/utils';
import { AppSelect } from '@/components/ui/AppSelect';
import { TIMEZONE_OPTIONS } from '@/lib/utils/timezones';

const selectClassName =
  'flex h-11 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const labelClassName = 'mb-1.5 block text-sm font-medium text-foreground';
const inputClassName = 'h-11 rounded-xl text-sm';

const BENEFITS = [
  { icon: Flame, label: 'Daily streaks', hint: 'Stay consistent' },
  { icon: CalendarDays, label: 'Weekly plans', hint: 'Set your goals' },
  { icon: MessageCircle, label: 'WhatsApp logs', hint: 'Quick check-ins' },
] as const;

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm font-medium text-destructive"
    >
      {message}
    </div>
  );
}

export default function RegisterForm() {
  const { setProfiles, setSelectedProfile } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'phone' | 'details'>('phone');
  const [formData, setFormData] = useState({
    phoneNumber: '',
    countryCode: '+91',
    name: '',
    email: '',
    password: '',
    city: '',
    locationPin: '',
    dateOfBirth: '',
    referredBy: '',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const refCode = searchParams.get('ref') || searchParams.get('referredBy');
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

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneError = validatePhone(formData.phoneNumber);
    if (phoneError) {
      setError(phoneError);
      setFieldErrors({ phoneNumber: phoneError });
      return;
    }
    setError('');
    setFieldErrors({});
    setStep('details');
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

    if (!formData.city.trim()) errors.city = 'City is required';

    const pinError = validatePinCode(formData.locationPin);
    if (pinError) errors.locationPin = pinError;

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
      setProfiles(response.data.data.profiles);
      setSelectedProfile(response.data.data.profiles[0] || null);
      markOtpSession(
        formData.phoneNumber,
        formData.countryCode,
        response.data.data.otpExpiresInSeconds
      );
      router.push(
        `/verify-otp?phone=${formData.phoneNumber}&country=${encodeURIComponent(formData.countryCode)}`
      );
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldErrorClass = (field: string) =>
    fieldErrors[field] ? 'border-destructive focus-visible:ring-destructive/30' : '';

  return (
    <AuthShell
      size="wide"
      title={step === 'phone' ? `Join ${BRAND_NAME}` : 'Complete your profile'}
      subtitle={
        step === 'phone'
          ? 'Create your account in under a minute. We’ll send a WhatsApp OTP to verify your number.'
          : 'Tell us a bit about yourself to personalize your wellness journey.'
      }
      headerExtra={<RegisterStepper step={step} />}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
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
            transition={{ duration: 0.25 }}
            onSubmit={handlePhoneSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, label, hint }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label htmlFor="countryCode" className={labelClassName}>
                  Country
                </label>
                <CountryCodeSelect
                  id="countryCode"
                  compact
                  value={formData.countryCode}
                  onChange={(countryCode) => setFormData({ ...formData, countryCode })}
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="phoneNumber" className={labelClassName}>
                  Phone number
                </label>
                <Input
                  id="phoneNumber"
                  className={cn(inputClassName, fieldErrorClass('phoneNumber'))}
                  type="tel"
                  placeholder="9999999999"
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
                {fieldErrors.phoneNumber ? (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.phoneNumber}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">10-digit mobile number</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="referral" className={labelClassName}>
                Referral code{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              {isReferralLocked && formData.referredBy ? (
                <div className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success-soft px-3 py-2.5">
                  <Gift className="h-4 w-4 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-success">Invite applied</p>
                    <p className="truncate text-sm font-medium text-foreground">{formData.referredBy}</p>
                  </div>
                </div>
              ) : (
                <Input
                  id="referral"
                  className={inputClassName}
                  type="text"
                  placeholder="Enter referral code"
                  value={formData.referredBy}
                  onChange={(e) => setFormData({ ...formData, referredBy: e.target.value.trim() })}
                />
              )}
            </div>

            {error && <ErrorBanner message={error} />}

            <Button type="submit" className="w-full" size="lg" disabled={!phoneValid}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="details-step"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleRegister}
            className="space-y-4"
          >
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/60 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Phone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Verifying next
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formData.countryCode} {formData.phoneNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError('');
                  setFieldErrors({});
                }}
                className="text-xs font-semibold text-primary hover:underline"
                disabled={loading}
              >
                Edit
              </button>
            </div>

            <FormSection title="About you" description="How we’ll address you in the app" icon={UserRound}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={labelClassName}>
                    Full name
                  </label>
                  <Input
                    id="name"
                    className={cn(inputClassName, fieldErrorClass('name'))}
                    type="text"
                    placeholder="John Doe"
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
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className={labelClassName}>
                    Email
                  </label>
                  <Input
                    id="email"
                    className={cn(inputClassName, fieldErrorClass('email'))}
                    type="email"
                    placeholder="john@example.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => {
                      clearFieldError('email');
                      setFormData({ ...formData, email: e.target.value });
                    }}
                    required
                    disabled={loading}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="dateOfBirth" className={labelClassName}>
                    Date of birth
                  </label>
                  <Input
                    id="dateOfBirth"
                    className={cn(inputClassName, fieldErrorClass('dateOfBirth'))}
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      clearFieldError('dateOfBirth');
                      setFormData({ ...formData, dateOfBirth: e.target.value });
                    }}
                    required
                    disabled={loading}
                  />
                  {fieldErrors.dateOfBirth && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.dateOfBirth}</p>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection title="Location" description="For local leaderboards and reminders" icon={MapPin}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className={labelClassName}>
                    City
                  </label>
                  <Input
                    id="city"
                    className={cn(inputClassName, fieldErrorClass('city'))}
                    type="text"
                    placeholder="Mumbai"
                    autoComplete="address-level2"
                    value={formData.city}
                    onChange={(e) => {
                      clearFieldError('city');
                      setFormData({ ...formData, city: e.target.value });
                    }}
                    required
                    disabled={loading}
                  />
                  {fieldErrors.city && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.city}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="locationPin" className={labelClassName}>
                    Pin code
                  </label>
                  <Input
                    id="locationPin"
                    className={cn(inputClassName, fieldErrorClass('locationPin'))}
                    type="text"
                    inputMode="numeric"
                    placeholder="400001"
                    maxLength={6}
                    value={formData.locationPin}
                    onChange={(e) => {
                      clearFieldError('locationPin');
                      setFormData({
                        ...formData,
                        locationPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                      });
                    }}
                    required
                    disabled={loading}
                  />
                  {fieldErrors.locationPin && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.locationPin}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="timezone" className={labelClassName}>
                    Timezone
                  </label>
                  <AppSelect
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="h-11"
                    disabled={loading}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </AppSelect>
                </div>
              </div>
            </FormSection>

            <FormSection title="Security" description="Choose a password for sign-in" icon={Shield}>
              <div>
                <label htmlFor="password" className={labelClassName}>
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    className={cn(inputClassName, 'pr-11', fieldErrorClass('password'))}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
                ) : (
                  <PasswordStrengthMeter strength={passwordStrength} />
                )}
              </div>
            </FormSection>

            {error && <ErrorBanner message={error} />}

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By creating an account, you agree to receive WhatsApp messages for OTP and activity
              reminders from {BRAND_NAME}.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('phone');
                  setError('');
                  setFieldErrors({});
                }}
                className="w-full sm:w-auto sm:min-w-[120px]"
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:min-w-[180px]" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
