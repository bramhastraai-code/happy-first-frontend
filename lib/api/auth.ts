import api from './axios';

export interface RegisterData {
  phoneNumber: string;
  countryCode: string;
  name: string;
  email: string;
  city?: string;
  locationPin?: string;
  dateOfBirth?: string;
  referredBy?: string;
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

export interface ChangePasswordData {
  oldPassword: string;
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
  locationPin?: string;
  dateOfBirth?: string;
  password?: string;
  timezone?: string;
  reminderTime?: string;
  profile?: {
    health?: string;
    family?: string;
    profession?: string;
    schedule?: string;
    personalCare?: string;
    challenges?: string;
    goals?: string;
    likes?: string;
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
  };
}

export const authAPI = {
  register: (data: RegisterData) => api.post('/userAuth/register', data),
  
  verifyOTP: (data: VerifyOTPData) => api.post('/userAuth/verify-otp', data),
  
  login: (data: LoginData) => api.post('/userAuth/login', data),
  
  requestLoginOTP: (data: RequestLoginOTPData) => api.post('/userAuth/req-login-otp', data),
  
  verifyLoginOTP: (data: VerifyLoginOTPData) => api.post('/userAuth/login-otp-verify', data),
  
  refresh: () => api.post('/userAuth/refresh'),
  
  logout: () => api.post('/userAuth/logout'),
  
  updateProfile: (data: UpdateProfileData) => api.patch('/userAuth/update-profile', data),
  
  changePassword: (data: ChangePasswordData) => api.post('/userAuth/change-password', data),
  
  addFamilyMember: (data: AddFamilyMemberData) => api.post('/userAuth/add-family-member', data),
  
  sendWelcomeMessage: (phoneNumber: string, countryCode: string) =>
    api.post('/userAuth/send-welcome-message', { phoneNumber, countryCode }),

  userInfo: () => api.get('/userAuth/user-info'),

  referralStats: () => api.get('/userAuth/referralStats'),
};
