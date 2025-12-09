'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAccessToken } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  useEffect(() => {
    const phone = searchParams.get('phone');
    const country = searchParams.get('country');
    if (phone && country) {
      setPhoneNumber(phone);
      // Decode the country code to handle + sign (encoded as %2B in URL)
      setCountryCode(decodeURIComponent(country));
    } else {
      router.push('/register');
    }
  }, [searchParams, router]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP({
        phoneNumber,
        countryCode,
        otp: otpCode,
      });

      const { user, accessToken } = response.data.data;
      setUser(user);
      setAccessToken(accessToken);

      // Redirect to activity selection (mandatory step)
      router.push('/activity-selection');
      router.push('/home');
    } catch (err) {
      setError((err as any).response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await authAPI.sendWelcomeMessage(phoneNumber, countryCode);
      alert('OTP sent successfully!');
    } catch {
      alert('Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h1>
          <p className="text-gray-600">
            Enter the 6-digit code sent to<br />
            <span className="font-semibold">{countryCode} {phoneNumber}</span>
          </p>
        </div>

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
                className="w-12 h-12 text-center text-xl font-semibold"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Resend OTP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
