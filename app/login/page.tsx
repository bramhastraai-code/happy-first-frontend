'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();

  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    countryCode: '+91',
    password: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      const { user, accessToken } = response.data.data;

      setUser(user);
      setAccessToken(accessToken);

      router.push('/home');
    } catch (err) {
      setError((err as any).response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await authAPI.requestLoginOTP({
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      });
      setOtpSent(true);
      setSuccessMessage('OTP sent successfully to your phone!');
    } catch (err) {
      setError((err as any).response?.data?.message || 'Failed to send OTP');
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
      const { user, accessToken } = response.data.data;

      setUser(user);
      setAccessToken(accessToken);

      router.push('/home');
    } catch (err) {
      setError((err as any).response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Happy First Club
          </h2>
        </div>

        {/* Login Method Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('password');
              setOtpSent(false);
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              loginMethod === 'password'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('otp');
              setError('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              loginMethod === 'otp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            OTP
          </button>
        </div>

        <form
          onSubmit={
            loginMethod === 'password'
              ? handlePasswordLogin
              : otpSent
              ? handleVerifyOTP
              : handleRequestOTP
          }
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country Code
            </label>
            <select
              value={formData.countryCode}
              onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={otpSent && loginMethod === 'otp'}
            >
              <option value="+91">+91 (India)</option>
              <option value="+1">+1 (USA/Canada)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+61">+61 (Australia)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="9999999999"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
              disabled={otpSent && loginMethod === 'otp'}
            />
          </div>

          {loginMethod === 'password' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          )}

          {loginMethod === 'otp' && otpSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP
              </label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                maxLength={6}
                required
              />
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading
              ? loginMethod === 'password'
                ? 'Logging in...'
                : otpSent
                ? 'Verifying OTP...'
                : 'Sending OTP...'
              : loginMethod === 'password'
              ? 'Login with Password'
              : otpSent
              ? 'Verify OTP'
              : 'Send OTP'}
          </Button>

          {loginMethod === 'otp' && otpSent && (
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setFormData({ ...formData, otp: '' });
                setError('');
                setSuccessMessage('');
              }}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Change phone number
            </button>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline font-medium">
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
