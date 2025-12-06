import { create } from 'zustand';
import { api } from '@/lib/api';
import { UserData } from './types';
import { persist } from 'zustand/middleware';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    token: string | null;
    userData: UserData | null;
    needsProfileCompletion: boolean;

    setAuth: (token: string, userData?: UserData) => void;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    verifyOtp: (data: any) => Promise<void>;
    logout: () => void;
    completeProfile: (data: any) => Promise<void>;
    skipProfile: (data: any) => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            isLoading: false,
            token: null,
            userData: null,
            needsProfileCompletion: false,

            setAuth: (token, userData) => {
                const needsProfileCompletion = userData ?
                    (userData.onboardingStatus === 'otp_pending' || userData.onboardingStatus === 'profile_pending') : false;
                set({ isAuthenticated: true, token, userData: userData || null, needsProfileCompletion });
            },

            login: async (data) => {
                set({ isLoading: true });
                try {
                    const response = await api.login(data);
                    if (response.success && response.data) {
                        const { token, user } = response.data.data;
                        const userData = Array.isArray(user) ? user[0] : user;
                        get().setAuth(token, userData);
                    } else {
                        throw new Error(response.error || 'Login failed');
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            register: async (data) => {
                set({ isLoading: true });
                try {
                    const response = await api.register(data);
                    if (!response.success) {
                        throw new Error(response.error || 'Registration failed');
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            verifyOtp: async (data) => {
                set({ isLoading: true });
                try {
                    const response = await api.verifyOtp(data);
                    if (response.success && response.data) {
                        const { token, user } = response.data.data;
                        const userData = Array.isArray(user) ? user[0] : user;
                        get().setAuth(token, userData);
                    } else {
                        throw new Error(response.error || 'OTP verification failed');
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            logout: async () => {
                try {
                    await api.post('/userAuth/logout', {});
                } catch (error) {
                    console.error('Logout failed', error);
                }
                set({ isAuthenticated: false, token: null, userData: null, needsProfileCompletion: false });
            },

            completeProfile: async (data) => {
                set({ isLoading: true });
                try {
                    const response = await api.updateProfile(data);
                    if (response.success && response.data) {
                        const userData = response.data.data;
                        set((state) => ({
                            userData: state.userData ? { ...state.userData, ...userData } : null,
                            needsProfileCompletion: false
                        }));
                    } else {
                        throw new Error(response.error || 'Failed to complete profile');
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            skipProfile: async (data) => {
                return get().completeProfile(data);
            },

            checkAuth: async () => {
                // Optional: verify token validity or refresh it
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                token: state.token,
                userData: state.userData,
                needsProfileCompletion: state.needsProfileCompletion
            }),
        }
    )
);
