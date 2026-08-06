'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle, ImagePlus, X } from 'lucide-react';
import {
  feedbackAPI,
  type FeedbackCategory,
  type FeedbackSubmission,
} from '@/lib/api/feedback';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { cn } from '@/lib/utils';

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'general', label: 'General feedback' },
  { value: 'bug', label: 'Bug report' },
  { value: 'error', label: 'Error Occurred' },
  { value: 'feature', label: 'Feature request' },
  { value: 'improvement', label: 'Improvement' },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

const MAX_SCREENSHOTS = 3;

export default function SupportFeedbackForm() {
  const { selectedProfile, user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FeedbackSubmission>({
    userName: selectedProfile?.name || user?.name || '',
    userPhone: user?.phoneNumber || '',
    message: '',
    category: 'general',
  });
  const [screenshots, setScreenshots] = useState<{ blob: Blob; preview: string }[]>([]);
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

  useEffect(() => {
    return () => {
      screenshots.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [screenshots]);

  const handleInputChange = (field: keyof FeedbackSubmission, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError('');
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) {
      setError(`You can attach up to ${MAX_SCREENSHOTS} screenshots.`);
      return;
    }

    const next: { blob: Blob; preview: string }[] = [];
    for (const file of Array.from(fileList).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImageForUpload(file);
        next.push({
          blob: compressed,
          preview: URL.createObjectURL(compressed),
        });
      } catch {
        next.push({ blob: file, preview: URL.createObjectURL(file) });
      }
    }
    if (next.length) {
      setScreenshots((prev) => [...prev, ...next].slice(0, MAX_SCREENSHOTS));
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.message.trim()) {
      setError('Please describe the issue or feedback');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await feedbackAPI.submit({
        ...formData,
        screenshots: screenshots.map((item) => item.blob),
      });

      if (response.success) {
        setSuccess('Thank you — your feedback was sent to our team.');
        screenshots.forEach((item) => URL.revokeObjectURL(item.preview));
        setScreenshots([]);
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

  const isErrorCategory = formData.category === 'error' || formData.category === 'bug';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Share bugs, errors, ideas, or suggestions. Feedback is sent to our team via WhatsApp.
        App version and device details are included automatically.
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
          {isErrorCategory ? 'Describe the issue' : 'Message'}
        </label>
        <textarea
          id="support-message"
          placeholder={
            isErrorCategory
              ? 'What went wrong? What were you doing when it happened?'
              : "Tell us what's on your mind…"
          }
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          className={cn(FIELD_CLASS, 'min-h-[7rem] resize-y')}
          required
          rows={4}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">
            Screenshots <span className="text-muted-foreground">(optional, up to {MAX_SCREENSHOTS})</span>
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Add images
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {screenshots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {screenshots.map((item, index) => (
              <div key={item.preview} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeScreenshot(index)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="Remove screenshot"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Attach screenshots to help us reproduce errors faster.
          </p>
        )}
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
