import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  _id: string;
  phoneNumber: string;
  countryCode: string;
  name: string;
  email: string;
  city?: string;
  locationPin?: string;
  dateOfBirth?: string;
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
      distance?: "km" | "miles";
      volume?: "L" | "oz";
      steps?: "steps";
    };
  };
  preferences?: {
    tone?: "soft" | "coach" | "strict";
    summaryOptIn?: boolean;
    unlockedSets?: number[];
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: () => boolean;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

// Helper function to set cookie
const setCookie = (name: string, value: string, days: number = 7) => {
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
      accessToken: typeof window !== 'undefined' ? getCookie("accessToken") : null,
      isAuthenticated: () => !!get().accessToken && !!get().user,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setAccessToken: (token) => {
        if (token) {
          setCookie("accessToken", token, 7);
        } else {
          deleteCookie("accessToken");
        }
        set({ accessToken: token });
      },
      logout: () => {
        deleteCookie("accessToken");
        set({ user: null, accessToken: null });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user
      }),
      onRehydrateStorage: () => (state) => {
        // Sync token from cookie after rehydration
        if (state) {
          const token = getCookie("accessToken");
          if (token) {
            state.accessToken = token;
          }
          state.setHydrated(true);
        }
      },
    }
  )
);
