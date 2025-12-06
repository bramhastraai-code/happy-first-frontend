export interface User {
    _id: string;
    name: string;
    phoneNumber: string;
    countryCode: string;
    email: string;
    city?: string;
    dateOfBirth?: string;
    level: 'newbie' | 'achiever' | 'expert' | 'leader' | 'champion';
    onboardingStatus: 'otp_pending' | 'profile_pending' | 'active' | 'suspended';
    stats?: {
        totalPoints: number;
        currentStreak: number;
        unbeatenStreaks: number;
    };
}

export interface RegisterData {
    phoneNumber: string;
    countryCode: string;
    name: string;
    email: string;
    referredBy?: string;
}

export interface LoginData {
    phoneNumber: string;
    countryCode: string;
    password: string;
}

export interface ProfileData {
    password: string;
    city: string;
    dateOfBirth: string;
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
    };
}

export interface Activity {
    _id: string;
    name: string;
    baseUnit: string;
    tier: number;
    allowedCadence: string[];
    description?: string;
}

export interface WeeklyPlanActivity {
    activityId: string;
    cadence: 'daily' | 'weekly';
    targetValue: number;
}

export interface DailyLogActivity {
    activityId: string;
    value: number;
}
