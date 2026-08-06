import api from './axios';

export type FeedbackCategory = 'bug' | 'feature' | 'general' | 'improvement' | 'error';

export interface FeedbackSubmission {
  userName: string;
  userPhone?: string;
  message: string;
  category?: FeedbackCategory;
  appVersion?: string;
  platform?: string;
  userAgent?: string;
  diagnostics?: string;
  /** Optional screenshot blobs (JPEG/PNG/WebP), max 3 */
  screenshots?: Blob[];
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  data?: {
    success?: boolean;
    message?: string;
    attachments?: number;
  };
  error?: unknown;
}

function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'web';
}

export function buildFeedbackDiagnostics(extra?: Record<string, unknown>): string {
  if (typeof window === 'undefined') return '';
  const payload = {
    href: window.location.href,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    online: navigator.onLine,
    ...extra,
  };
  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

export const feedbackAPI = {
  submit: async (feedback: FeedbackSubmission): Promise<FeedbackResponse> => {
    const appVersion = feedback.appVersion || process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
    const platform = feedback.platform || detectPlatform();
    const userAgent =
      feedback.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined);
    const diagnostics = feedback.diagnostics || buildFeedbackDiagnostics();

    const screenshots = feedback.screenshots || [];
    if (screenshots.length > 0) {
      const form = new FormData();
      form.append('userName', feedback.userName);
      if (feedback.userPhone) form.append('userPhone', feedback.userPhone);
      form.append('message', feedback.message);
      if (feedback.category) form.append('category', feedback.category);
      form.append('appVersion', appVersion);
      form.append('platform', platform);
      if (userAgent) form.append('userAgent', userAgent);
      if (diagnostics) form.append('diagnostics', diagnostics);
      screenshots.slice(0, 3).forEach((blob, index) => {
        const type = blob.type || 'image/jpeg';
        const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
        form.append('screenshots', blob, `screenshot-${index + 1}.${ext}`);
      });
      const response = await api.post('/feedback/submit', form);
      return response.data;
    }

    const response = await api.post('/feedback/submit', {
      userName: feedback.userName,
      userPhone: feedback.userPhone,
      message: feedback.message,
      category: feedback.category,
      appVersion,
      platform,
      userAgent,
      diagnostics,
    });
    return response.data;
  },
};
