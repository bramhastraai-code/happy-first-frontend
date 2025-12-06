import { create } from 'zustand';
import { DashboardMetrics } from './types';

interface DashboardState {
    metrics: DashboardMetrics;
    updateMetrics: (data: Partial<DashboardMetrics>) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    metrics: { weeklyPoints: 0, rank: 0, streaks: {} },
    updateMetrics: (data) => set((state) => ({ metrics: { ...state.metrics, ...data } })),
}));
