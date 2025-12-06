import { create } from 'zustand';
import { api } from '@/lib/api';

interface DailyLogState {
    todaySummary: any | null;
    weeklySummary: any | null;
    isLoading: boolean;
    error: string | null;

    fetchTodaySummary: () => Promise<void>;
    fetchWeeklySummary: () => Promise<void>;
    submitLog: (activities: { activityId: string; value: number }[]) => Promise<void>;
}

export const useDailyLogStore = create<DailyLogState>((set) => ({
    todaySummary: null,
    weeklySummary: null,
    isLoading: false,
    error: null,

    fetchTodaySummary: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getSummary('daily');
            if (response.success && response.data) {
                set({ todaySummary: response.data.data });
            } else {
                set({ error: response.error || 'Failed to fetch daily summary' });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchWeeklySummary: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getSummary('weekly');
            if (response.success && response.data) {
                set({ weeklySummary: response.data.data });
            } else {
                set({ error: response.error || 'Failed to fetch weekly summary' });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    submitLog: async (activities) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.submitDailyLog(activities);
            if (response.success && response.data) {
                // Refresh summary after submission
                const summaryResponse = await api.getSummary('daily');
                if (summaryResponse.success && summaryResponse.data) {
                    set({ todaySummary: summaryResponse.data.data });
                }
            } else {
                throw new Error(response.error || 'Failed to submit log');
            }
        } finally {
            set({ isLoading: false });
        }
    },
}));
