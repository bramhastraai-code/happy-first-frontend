import api from './axios';
import type { ReminderScheduleInput } from '@/lib/utils/reminderSchedule';

export interface RegisterData {
  phoneNumber: string;
  countryCode: string;
  name: string;
  username?: string;
  email?: string;
  city?: string;
  area?: string;
  state?: string;
  country?: string;
  locationPin?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | '';
  referredBy?: string;
  password?: string;
  timezone?: string;
}

export interface VerifyOTPData {
  phoneNumber: string;
  countryCode: string;
  otp: string;
}

export interface LoginData {
  phoneNumber: string;
  countryCode: string;
  password: string;
}

export interface RequestLoginOTPData {
  phoneNumber: string;
  countryCode: string;
}

export interface VerifyLoginOTPData {
  phoneNumber: string;
  countryCode: string;
  otp: string;
}

export interface RequestMagicLinkData {
  phoneNumber: string;
  countryCode: string;
  profileId?: string; // Optional: Auto-select this profile after login
  redirectTo?: 'tasks' | 'create-plan'; // Optional: Redirect to specific page after login
}

export interface VerifyMagicLinkData {
  token: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequestData {
  phoneNumber: string;
  countryCode: string;
}

export interface ResetPasswordData {
  phoneNumber: string;
  countryCode: string;
  otp: string;
  newPassword: string;
}

export interface AddFamilyMemberData {
  name: string;
  relationship: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  level?: 'newbie' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  timezone: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  city?: string;
  area?: string;
  country?: string;
  locationPin?: string;
  dateOfBirth?: string;
  password?: string;
  timezone?: string;
  reminderTime?: string;
  reminderSchedule?: ReminderScheduleInput;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  avatarUrl?: string | null;
  bio?: string;
  website?: string;
  publicHighlight?: string;
  gender?: 'male' | 'female' | 'other';
  happinessOnboarding?: {
    completedAt?: string | null;
    body?: number | null;
    mind?: number | null;
    happiness?: number | null;
    connected?: number | null;
    stress?: number | null;
    sleep?: number | null;
    todayHappiness?: number | null;
    score?: number | null;
  };
  profile?: {
    health?: string;
    family?: string;
    profession?: string;
    schedule?: string;
    personalCare?: string;
    challenges?: string;
    goals?: string;
    likes?: string;
    weight?: number;
    dislikes?: string;
    medicalConditions?: string;
    unitsPreference?: {
      distance?: 'km' | 'miles';
      volume?: 'L' | 'oz';
      steps?: 'steps';
    };
  };
  familyMembers?: Array<{
    name: string;
    relationship: string;
    age: number;
    level?: 'newbie' | 'achiever' | 'expert' | 'leader' | 'champion';
  }>;
  preferences?: {
    tone?: 'soft' | 'coach' | 'strict';
    summaryOptIn?: boolean;
    unlockedSets?: number[];
    allowMessages?: boolean;
    mascotName?: string;
    mascotColor?: string;
    defaultLanding?: '/home' | '/feed' | '/community' | '/settings';
  };
}

export interface UpdatePauseData {
  pause: boolean;
}

export const authAPI = {
  register: (data: RegisterData) => api.post('/userAuth/register', data),
  
  verifyOTP: (data: VerifyOTPData) => api.post('/userAuth/verify-otp', data),
  
  login: (data: LoginData) => api.post('/userAuth/login', data),
  
  requestLoginOTP: (data: RequestLoginOTPData) =>
    api.post<{ data?: { otpExpiresInSeconds?: number } }>('/userAuth/req-login-otp', data),

  resendRegistrationOTP: (data: RequestLoginOTPData) =>
    api.post<{ data?: { otpExpiresInSeconds?: number } }>('/userAuth/resend-otp', data),
  
  verifyLoginOTP: (data: VerifyLoginOTPData) => api.post('/userAuth/login-otp-verify', data),
  
  requestMagicLink: (data: RequestMagicLinkData) => api.post('/userAuth/magic-link/request', data),
  
  verifyMagicLink: (token: string) => api.get('/userAuth/magic-link/verify', { params: { token } }),
  
  refresh: () => api.post('/userAuth/refresh'),
  
  logout: () => api.post('/userAuth/logout'),
  
  updateProfile: (data: UpdateProfileData) => api.patch('/userAuth/update-profile', data),

  uploadAvatar: (profileId: string, file: Blob, filename = 'avatar.jpg') => {
    const form = new FormData();
    form.append('avatar', file, filename);
    return api.post<{
      success: boolean;
      message: string;
      data: { profile: import('@/lib/store/authStore').Profile };
    }>(`/profile/${profileId}/avatar`, form);
  },
  
  changePassword: (data: ChangePasswordData) => api.post('/userAuth/change-password', data),

  requestForgotPasswordOTP: (data: ForgotPasswordRequestData) =>
    api.post<{ data?: { otpExpiresInSeconds?: number } }>('/userAuth/forgot-password/request', data),

  resetPasswordWithOTP: (data: ResetPasswordData) => api.post('/userAuth/forgot-password/reset', data),

  checkPhone: (data: { phoneNumber: string; countryCode: string }) =>
    api.post<{
      data: {
        exists: boolean;
        canRegister: boolean;
        resumable?: boolean;
        redirectTo?: string;
      };
    }>('/userAuth/check-phone', data),

  checkUsername: (username: string) =>
    api.get<{ data: { username: string; available: boolean } }>('/userAuth/check-username', {
      params: { username },
    }),
  
  addFamilyMember: (data: AddFamilyMemberData) => api.post('/userAuth/add-family-member', data),
  
  sendWelcomeMessage: (phoneNumber: string, countryCode: string) =>
    api.post('/userAuth/send-welcome-message', { phoneNumber, countryCode }),

  userInfo: () => api.get('/userAuth/user-info'),

  updatePause: (profileId: string, data: UpdatePauseData) => api.patch(`/profile/${profileId}/pause`, data),

  referralStats: () =>
    api.get<{ data: ReferralStatsData }>('/userAuth/referralStats'),

  /** Soft-delete account. confirmation must be exactly "delete profile". */
  deleteAccount: (confirmation: string) =>
    api.post<{ data: { deleted: boolean }; message?: string }>('/userAuth/delete-account', {
      confirmation,
    }),
};

export type ReferredMemberStatus = 'active' | 'inactive';

export interface ReferredMember {
  _id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  joinedAt?: string | null;
  createdAt?: string | null;
  onboardingStatus?: string | null;
  subscriptionStatus?: string | null;
  status: ReferredMemberStatus;
  canWhatsAppRemind?: boolean;
}

export interface ReferralActivityImpact {
  activityId: string;
  name: string;
  unit: string;
  category?: string | null;
  total: number;
  logCount: number;
}

export interface ReferralPlatformImpact {
  membersPercent: number;
  xpPercent: number;
  coinsPercent: number;
  feedPostsPercent: number;
  activitiesPercent: number;
  totals?: {
    referredMembers: number;
    platformMembers: number;
    referredXp: number;
    platformXp: number;
    referredCoins: number;
    platformCoins: number;
    referredFeedPosts: number;
    platformFeedPosts: number;
    referredActivityLogs: number;
    platformActivityLogs: number;
  };
}

export interface ReferralStatsData {
  totalReferrals: number;
  HappyPoints: number;
  happyCoinsEarned?: number;
  referredUsers: ReferredMember[];
  activityImpact?: ReferralActivityImpact[];
  platformImpact?: ReferralPlatformImpact;
  insight?: {
    daysSinceLastReferral: number | null;
    message: string;
  };
  activeWindowDays?: number;
}
