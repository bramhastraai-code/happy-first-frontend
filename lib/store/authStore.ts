import { create } from "zustand";
import { persist } from "zustand/middleware";
interface lifestyle {
  health: string;
  family: string;
  profession: string;
  schedule: string;
  personalCare: string;
  challenges: string;
  goals: string;
  likes: string;
  dislikes: string;
  medicalConditions: string;
  unitsPreference: {  
    distance: string;
    volume: string;
    steps: string;
  };
}

export interface Profile {
  user : string;
  _id: string;
  type: "primary" | "family";
  name: string;
  relationship: string;
  age: number;
  gender: "male" | "female" | "other";
  level: 'newbie' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  profile:lifestyle;
  timezone: string;
  reminderTime: string;
  stats:{ 
    totalPoints: number;
    totalWeeks: number;
    unbeatenStreaks: number;
    streak: number;
  };
  preferences: {
    tone: 'soft' | 'coach' | 'strict';
    summaryOptIn: boolean;
    unlockedSets: number[];
  };
  setting: {
    autoActivityPlanRenew: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  phoneNumber: string;
  countryCode: string;
  name: string;
  email: string;
  city?: string;
  locationPin?: string;
  dateOfBirth?: string;
  createdAt?: string;
  level?: string;
  HappyPoints?: number;
  refferalCode?: string;
  refferedBy?: string;
  trailEndOn?: Date;
  subscriptionStatus?: "trial"| "inactive"| "active";
}

interface AuthState {
  user: User | null;
  profiles: Profile[] | null;
  accessToken: string | null;
  selectedProfile: Profile | null;
  profileSelectedInSession: boolean;
  isAuthenticated: () => boolean;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setProfiles: (profiles: Profile[] | null) => void;
  setAccessToken: (token: string | null) => void;
  setSelectedProfile: (profile: Profile | null) => void;
  setProfileSelectedInSession: (selected: boolean) => void;
  needsProfileSelection: () => boolean;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

// Helper function to set cookie
export const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

// Helper function to delete cookie
const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// Helper function to get cookie
export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profiles: null,
      accessToken: typeof window !== 'undefined' ? getCookie("accessToken") : null,
      selectedProfile: null,
      profileSelectedInSession: false,
      isAuthenticated: () => !!get().accessToken && !!get().user,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setProfiles: (profiles) => set({ profiles }),
      setAccessToken: (token) => {
        if (token) {
          setCookie("accessToken", token, 7);
        } else {
          deleteCookie("accessToken");
        }
        set({ accessToken: token });
      },
      setSelectedProfile: (profile) => {
        set({ selectedProfile: profile, profileSelectedInSession: true });
      },
      setProfileSelectedInSession: (selected) => {
        set({ profileSelectedInSession: selected });
      },
      needsProfileSelection: () => {
        const state = get();
        return state.isAuthenticated() && 
               (state.profiles?.length || 0) > 1 && 
               !state.selectedProfile;
      },
      logout: () => {
        deleteCookie("accessToken");
        set({ user: null, profiles: null, accessToken: null, selectedProfile: null, profileSelectedInSession: false });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user,
        profiles: state.profiles,
        selectedProfile: state.selectedProfile
      }),
      onRehydrateStorage: () => (state) => {
        // Sync token from cookie after rehydration
        if (state) {
          const token = getCookie("accessToken");
          if (token) {
            state.accessToken = token;
          }
          // Reset session flag on page reload
          state.profileSelectedInSession = false;
          state.setHydrated(true);
        }
      },
    }
  )
);
