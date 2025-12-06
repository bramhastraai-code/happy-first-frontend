'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function VerifyOTPPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyOtp, needsProfileCompletion } = useAuthStore();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const phoneNumber = searchParams.get('phone') || '';
    const countryCode = searchParams.get('code') || '+91';

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0];
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await verifyOtp({ phoneNumber, countryCode, otp: otpValue });

            if (needsProfileCompletion) {
                router.push('/complete-profile');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            document.getElementById('otp-0')?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-96 h-96 bg-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="glass-strong p-10 rounded-3xl shadow-2xl max-w-md w-full relative z-10 border-2 border-white/50">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-block relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-2xl opacity-40 animate-pulse-glow"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black mb-3">
                        <span className="gradient-text">Verify OTP</span>
                    </h1>
                    <p className="text-gray-600 text-base">
                        Enter the 6-digit code sent to<br />
                        <span className="font-bold text-gray-800">{countryCode} {phoneNumber}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* OTP Input */}
                    <div className="flex gap-3 justify-center">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-14 h-16 text-center text-3xl font-black border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 bg-white shadow-lg"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-5 py-4 rounded-2xl animate-shake flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || otp.join('').length !== 6}
                        className="w-full bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                Verifying...
                            </span>
                        ) : (
                            <>
                                <span className="relative z-10">Verify OTP</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                            </>
                        )}
                    </button>

                    {/* Resend Button */}
                    <button
                        type="button"
                        className="w-full text-purple-600 hover:text-purple-700 font-bold text-lg hover:underline transition-all flex items-center justify-center gap-2 group"
                    >
                        <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Resend OTP
                    </button>
                </form>
            </div>
        </div>
    );
}
