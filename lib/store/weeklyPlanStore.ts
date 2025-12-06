import { create } from 'zustand';
import { Activity } from './types';
import { api } from '@/lib/api';

interface WeeklyPlanState {
    activities: Activity[];
    selectedActivities: Activity[];
    currentPlan: any | null;
    isLoading: boolean;
    error: string | null;

    fetchActivities: () => Promise<void>;
    fetchCurrentPlan: () => Promise<void>;
    createPlan: (activities: any[]) => Promise<void>;
    setActivities: (activities: Activity[]) => void;
    selectActivities: (activities: Activity[]) => void;
}

export const useWeeklyPlanStore = create<WeeklyPlanState>((set) => ({
    activities: [],
    selectedActivities: [],
    currentPlan: null,
    isLoading: false,
    error: null,

    fetchActivities: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getActivities();
            if (response.success && response.data) {
                set({ activities: response.data.data });
            } else {
                set({ error: response.error || 'Failed to fetch activities' });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchCurrentPlan: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getWeeklyPlan();
            if (response.success && response.data) {
                set({ currentPlan: response.data.data });
            } else {
                set({ currentPlan: null });
            }
        } finally {
            set({ isLoading: false });
        }
    },

    createPlan: async (activities) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.createWeeklyPlan({ activities });
            if (response.success && response.data) {
                set({ currentPlan: response.data.data });
            } else {
                throw new Error(response.error || 'Failed to create plan');
            }
        } finally {
            set({ isLoading: false });
        }
    },

    setActivities: (activities) => set({ activities }),
    selectActivities: (activities) => set({ selectedActivities: activities }),
}));
