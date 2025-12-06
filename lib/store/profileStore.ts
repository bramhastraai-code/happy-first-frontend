import { create } from 'zustand';
import { UserProfile } from './types';

interface ProfileState {
    profile: UserProfile;
    updateProfile: (data: Partial<UserProfile>) => void;
    setProfileComplete: (complete: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
    profile: { profileComplete: false },
    updateProfile: (data) => set((state) => ({ profile: { ...state.profile, ...data } })),
    setProfileComplete: (complete) => set((state) => ({ profile: { ...state.profile, profileComplete: complete } })),
}));
