import api from './axios';

export interface FeedbackSubmission {
  userName: string;
  userPhone?: string;
  message: string;
  category?: 'bug' | 'feature' | 'general' | 'improvement';
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export const feedbackAPI = {
  submit: async (feedback: FeedbackSubmission): Promise<FeedbackResponse> => {
    const response = await api.post('/feedback/submit', feedback);
    return response.data;
  },
};
