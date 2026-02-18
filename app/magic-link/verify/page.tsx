'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore, Profile } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAccessToken, setProfiles, setSelectedProfile } = useAuthStore();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      const profileId = searchParams.get('profile');
      const redirectTo = searchParams.get('to'); // 'tasks' or 'create-plan'

      if (!token) {
        setStatus('error');
        setError('No token provided. Please request a new magic link.');
        return;
      }

      try {
        const response = await authAPI.verifyMagicLink(token);
        const { user, profiles, accessToken } = response.data.data;

        setUser(user);
        setProfiles(profiles);
        setAccessToken(accessToken);

        setStatus('success');

        // Determine redirect path based on 'to' parameter
        let redirectPath = '/home';
        if (redirectTo === 'tasks') {
          redirectPath = '/tasks';
        } else if (redirectTo === 'create-plan') {
          redirectPath = '/create-plan';
        }

        // Redirect after a brief delay to show success message
        setTimeout(() => {
          // If profile parameter exists, auto-select that profile
          if (profileId && profiles && profiles.length > 0) {
            const selectedProfile = profiles.find((p: Profile) => p._id === profileId);
            if (selectedProfile) {
              setSelectedProfile(selectedProfile);
              router.push(redirectPath);
            } else {
              // Profile not found, go to selection page
              router.push('/select-profile');
            }
          } else {
            // No profile specified, go to selection page
            router.push('/select-profile');
          }
        }, 1500);
      } catch (err: unknown) {
        setStatus('error');
        const errorMessage = err && typeof err === 'object' && 'response' in err 
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message 
          : null;
        setError(
          errorMessage || 'Invalid or expired magic link. Please request a new one.'
        );
      }
    };

    verifyToken();
  }, [searchParams, router, setUser, setAccessToken, setProfiles, setSelectedProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Magic Link</h1>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Happy First Club
          </h2>

          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-gray-600">Verifying your magic link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <svg
                    className="w-16 h-16 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xl font-semibold text-green-600">Login Successful!</p>
              <p className="text-gray-600">Redirecting you to your profile...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-red-100 rounded-full p-4">
                  <svg
                    className="w-16 h-16 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xl font-semibold text-red-600">Verification Failed</p>
              <p className="text-gray-600">{error}</p>
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
