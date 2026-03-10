'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { feedbackAPI, type FeedbackSubmission } from '@/lib/api/feedback';

export default function SupportPage() {
  const router = useRouter();
  const { selectedProfile, user } = useAuthStore();
  
  const [formData, setFormData] = useState<FeedbackSubmission>({
    userName: selectedProfile?.name || user?.name || '',
    userPhone: user?.phoneNumber || '',
    message: '',
    category: 'general',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (field: keyof FeedbackSubmission, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset status when user starts typing again
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.userName.trim()) {
      setErrorMessage('Please enter your name');
      setSubmitStatus('error');
      return;
    }
    
    if (!formData.message.trim()) {
      setErrorMessage('Please enter your feedback message');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await feedbackAPI.submit(formData);
      
      if (response.success) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          userName: selectedProfile?.name || user?.name || '',
          userPhone: user?.phoneNumber || '',
          message: '',
          category: 'general',
        });
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(response.message || 'Failed to submit feedback');
      }
    } catch (error: unknown) {
      setSubmitStatus('error');
      const err = error as { response?: { data?: { message?: string } } };
      setErrorMessage(err.response?.data?.message || 'An error occurred while submitting feedback');
      console.error('Feedback submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Support & Feedback</h1>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Need help or have suggestions?</span> We&apos;d love to hear from you! 
              Your feedback helps us improve the Happy First app.
            </p>
          </div>

          {/* Success Message */}
          {submitStatus === 'success' && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Feedback Submitted Successfully!</p>
                    <p className="text-sm">Thank you for your feedback. We&apos;ll review it shortly.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {submitStatus === 'error' && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-red-800">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Submission Failed</p>
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Form */}
          <Card>
            <CardHeader>
              <CardTitle>Share Your Feedback</CardTitle>
              <CardDescription>
                Tell us about bugs, suggest features, or share your thoughts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label htmlFor="userName" className="text-sm font-medium text-gray-700">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="userName"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.userName}
                    onChange={(e) => handleInputChange('userName', e.target.value)}
                    className="w-full"
                    required
                  />
                </div>

                {/* Phone Field (Optional) */}
                <div className="space-y-2">
                  <label htmlFor="userPhone" className="text-sm font-medium text-gray-700">
                    Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <Input
                    id="userPhone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.userPhone}
                    onChange={(e) => handleInputChange('userPhone', e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Category Field */}
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Feedback Type
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, category: e.target.value as FeedbackSubmission['category'] }));
                      if (submitStatus !== 'idle') {
                        setSubmitStatus('idle');
                        setErrorMessage('');
                      }
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement Suggestion</option>
                  </select>
                </div>

                {/* Message Field */}
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-gray-700">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    placeholder="Tell us what&apos;s on your mind..."
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    required
                    rows={5}
                  />
                  <p className="text-xs text-gray-500">
                    Be as detailed as possible to help us understand your feedback better.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || submitStatus === 'success'}
                    className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Your feedback is sent directly to our team via WhatsApp.</p>
            <p className="mt-1">We typically respond within 24-48 hours.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
