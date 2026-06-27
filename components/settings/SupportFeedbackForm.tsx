'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle } from 'lucide-react';
import { feedbackAPI, type FeedbackSubmission } from '@/lib/api/feedback';
import { cn } from '@/lib/utils';

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General feedback' },
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
  { value: 'improvement', label: 'Improvement' },
] as const;

const FIELD_CLASS =
  'w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

export default function SupportFeedbackForm() {
  const { selectedProfile, user } = useAuthStore();
  const [formData, setFormData] = useState<FeedbackSubmission>({
    userName: selectedProfile?.name || user?.name || '',
    userPhone: user?.phoneNumber || '',
    message: '',
    category: 'general',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      userName: selectedProfile?.name || user?.name || prev.userName,
      userPhone: user?.phoneNumber || prev.userPhone,
    }));
  }, [selectedProfile, user]);

  const handleInputChange = (field: keyof FeedbackSubmission, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.message.trim()) {
      setError('Please enter your feedback message');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await feedbackAPI.submit(formData);

      if (response.success) {
        setSuccess('Thank you — your feedback was sent to our team.');
        setFormData({
          userName: selectedProfile?.name || user?.name || '',
          userPhone: user?.phoneNumber || '',
          message: '',
          category: 'general',
        });
      } else {
        setError(response.message || 'Failed to submit feedback');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'An error occurred while submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary-soft px-4 py-5 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="text-sm font-semibold text-foreground">{success}</p>
        <p className="mt-1 text-xs text-muted-foreground">We typically respond within 24–48 hours.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setSuccess('')}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Share bugs, ideas, or suggestions. Feedback is sent to our team via WhatsApp.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="support-name" className="mb-1.5 block text-xs font-medium text-foreground">
            Your name
          </label>
          <Input
            id="support-name"
            type="text"
            placeholder="Your name"
            value={formData.userName}
            onChange={(e) => handleInputChange('userName', e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="support-phone" className="mb-1.5 block text-xs font-medium text-foreground">
            Phone <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="support-phone"
            type="tel"
            placeholder="Phone number"
            value={formData.userPhone}
            onChange={(e) => handleInputChange('userPhone', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="support-category" className="mb-1.5 block text-xs font-medium text-foreground">
          Feedback type
        </label>
        <select
          id="support-category"
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className={cn(FIELD_CLASS, 'h-10')}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="support-message" className="mb-1.5 block text-xs font-medium text-foreground">
          Message
        </label>
        <textarea
          id="support-message"
          placeholder="Tell us what's on your mind…"
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          className={cn(FIELD_CLASS, 'min-h-[7rem] resize-y')}
          required
          rows={4}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          'Submitting…'
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit feedback
          </>
        )}
      </Button>
    </form>
  );
}
