export interface UserData {
    _id: string
    phoneNumber: string
    countryCode: string
    name: string
    email: string
    city: string
    locationPin: string
    dateOfBirth: string
    timezone: string
    reminderTime: string
    level: string
    onboardingStatus: string
    referralCode: string
    referredBy: string | null
    subscriptionStatus: string
    stats: {
        totalPoints: number
        totalWeeks: number
        unbeatenStreaks: number
    }
    referralImpact: {
        steps: number
        floors: number
        minutes: number
    }
    preferences: {
        tone: string
        summaryOptIn: boolean
        unlockedSets: number[]
    }
}

export interface UserProfile {
    id?: string
    name?: string
    email?: string
    phoneNumber?: string
    profileComplete: boolean
}

export interface Activity {
    id: string
    name: string
    icon?: string
    unit: string
    target?: number
}

export interface DashboardMetrics {
    weeklyPoints: number
    rank: number
    streaks: Record<string, number>
}
