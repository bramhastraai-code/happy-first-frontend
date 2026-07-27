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

const labelClassName = 'mb-1.5 block text-sm font-medium text-foreground';

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

  const goToPhoneStep = () => {
    setStep('phone');
    setError('');
    setFieldErrors({});
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
      markOtpSession(
        formData.phoneNumber,
        formData.countryCode,
        response.data.data?.otpExpiresInSeconds
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
      title={step === 'phone' ? 'Create your account' : 'Complete your profile'}
      subtitle={
        step === 'phone'
          ? `Join ${BRAND_NAME} with your WhatsApp number. We’ll send a code to verify it.`
          : 'A few details so we can personalize your wellness journey.'
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
            transition={{ duration: 0.2 }}
            onSubmit={handlePhoneSubmit}
            className="space-y-4"
          >
            <div>
              <label htmlFor="countryCode" className={labelClassName}>
                Country code
              </label>
              <CountryCodeSelect
                id="countryCode"
                value={formData.countryCode}
                onChange={(countryCode) => setFormData({ ...formData, countryCode })}
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className={labelClassName}>
                Phone number
              </label>
              <Input
                id="phoneNumber"
                className={fieldErrorClass('phoneNumber')}
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
              <FieldError message={fieldErrors.phoneNumber} />
              {!fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-muted-foreground">10-digit mobile number</p>
              )}
            </div>

            <div>
              <label htmlFor="referral" className={labelClassName}>
                Referral code{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              {isReferralLocked && formData.referredBy ? (
                <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success-soft px-3.5 py-3">
                  <Gift className="h-4 w-4 shrink-0 text-success" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-success">Invite applied</p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {formData.referredBy}
                    </p>
                  </div>
                </div>
              ) : (
                <Input
                  id="referral"
                  type="text"
                  placeholder="Enter referral code"
                  value={formData.referredBy}
                  onChange={(e) =>
                    setFormData({ ...formData, referredBy: e.target.value.trim() })
                  }
                />
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-destructive"
              >
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={!phoneValid}>
              Continue
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="details-step"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegister}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/70 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone number</p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {formData.countryCode} {formData.phoneNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={goToPhoneStep}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
                disabled={loading}
              >
                Edit
              </button>
            </div>

            <div>
              <label htmlFor="name" className={labelClassName}>
                Full name
              </label>
              <Input
                id="name"
                className={fieldErrorClass('name')}
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
              <FieldError message={fieldErrors.name} />
            </div>

            <div>
              <label htmlFor="email" className={labelClassName}>
                Email
              </label>
              <Input
                id="email"
                className={fieldErrorClass('email')}
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
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className={labelClassName}>
                Date of birth
              </label>
              <Input
                id="dateOfBirth"
                className={fieldErrorClass('dateOfBirth')}
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => {
                  clearFieldError('dateOfBirth');
                  setFormData({ ...formData, dateOfBirth: e.target.value });
                }}
                required
                disabled={loading}
              />
              <FieldError message={fieldErrors.dateOfBirth} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className={labelClassName}>
                  City
                </label>
                <Input
                  id="city"
                  className={fieldErrorClass('city')}
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
                <FieldError message={fieldErrors.city} />
              </div>
              <div>
                <label htmlFor="locationPin" className={labelClassName}>
                  Pin code
                </label>
                <Input
                  id="locationPin"
                  className={fieldErrorClass('locationPin')}
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
                <FieldError message={fieldErrors.locationPin} />
              </div>
            </div>

            <div>
              <label htmlFor="timezone" className={labelClassName}>
                Timezone
              </label>
              <AppSelect
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="h-12 rounded-2xl text-base md:text-sm"
                disabled={loading}
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </AppSelect>
            </div>

            <div>
              <label htmlFor="password" className={labelClassName}>
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  className={cn('pr-11', fieldErrorClass('password'))}
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
                <FieldError message={fieldErrors.password} />
              ) : (
                <PasswordStrengthMeter strength={passwordStrength} />
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-destructive"
              >
                {error}
              </div>
            )}

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to receive WhatsApp messages for OTP and reminders from{' '}
              {BRAND_NAME}.
            </p>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>

            <button
              type="button"
              onClick={goToPhoneStep}
              className="w-full text-sm font-medium text-primary hover:underline"
              disabled={loading}
            >
              Back to phone number
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
