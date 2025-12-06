import { create } from 'zustand';
import { api } from '@/lib/api';

interface LeaderboardState {
    leaderboard: any | null;
    isLoading: boolean;
    error: string | null;

    fetchLeaderboard: (type: 'weekly' | 'all-time' | 'referral') => Promise<void>;
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
    leaderboard: null,
    isLoading: false,
    error: null,

    fetchLeaderboard: async (type) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getLeaderboard(type);
            if (response.success && response.data) {
                set({ leaderboard: response.data.data });
            } else {
                set({ error: response.error || 'Failed to fetch leaderboard' });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },
}));
