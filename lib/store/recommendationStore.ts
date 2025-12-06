import { create } from 'zustand';
import { api } from '@/lib/api';

interface RecommendationState {
    recommendations: any[];
    message: string;
    isLoading: boolean;
    error: string | null;

    fetchRecommendations: () => Promise<void>;
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
    recommendations: [],
    message: '',
    isLoading: false,
    error: null,

    fetchRecommendations: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getRecommendations();
            if (response.success && response.data) {
                set({
                    recommendations: response.data.data.recommendations,
                    message: response.data.data.message
                });
            } else {
                set({ error: response.error || 'Failed to fetch recommendations' });
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },
}));
