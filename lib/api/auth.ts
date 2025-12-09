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
  
  refresh: () => api.post('/userAuth/refresh'),
  
  logout: () => api.post('/userAuth/logout'),
  
  updateProfile: (data: UpdateProfileData) => api.patch('/userAuth/update-profile', data),
  
  sendWelcomeMessage: (phoneNumber: string, countryCode: string) =>
    api.post('/userAuth/send-welcome-message', { phoneNumber, countryCode }),
};
