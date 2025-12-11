'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { X, Sparkles, Target, Trophy, Calendar, ChevronRight } from 'lucide-react';

interface WelcomeBannerProps {
  userName: string;
  onClose: () => void;
}

export default function WelcomeBanner({ userName, onClose }: WelcomeBannerProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps = [
    {
      title: '🎉 Welcome to Your Wellness Journey!',
      description: `Hi ${userName}! Your personalized weekly plan will started. Let's give you a quick tour!`,
      icon: Sparkles,
      color: 'from-blue-500 to-purple-500',
    },
    {
      title: '⚡ Point System',
      description: 'Earn points by completing activities! Each activity has a point value based on effort and impact. Track your daily and weekly scores to see your progress.',
      icon: Trophy,
      color: 'from-pink-500 to-rose-500',
      details: [
        'Complete activities to earn points',
        'Daily targets help you stay consistent',
        'Weekly scores show your overall progress',
      ],
    },
    {
      title: '🎯 Activities & Goals',
      description: 'Your personalized activities are designed for your lifestyle. You can track daily activities (like water intake) and weekly goals (like yoga sessions).',
      icon: Target,
      color: 'from-green-500 to-emerald-500',
      details: [
        'Daily activities: Track every day',
        'Weekly activities: Complete by week end',
        'Flexible tracking to fit your schedule',
      ],
    },
    {
      title: '📅 Your Weekly Plan',
      description: 'Each week starts on Monday with fresh goals. Check the "Upcoming" page to see your plan. Once it\'s active, come back here to track progress!',
      icon: Calendar,
      color: 'from-amber-500 to-orange-500',
      details: [
        'New plan every Monday',
        'Track progress daily',
        'Review weekly performance',
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentTourStep = tourSteps[currentStep];
  const Icon = currentTourStep.icon;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white shadow-2xl">
        <CardContent className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress indicators */}
          <div className="flex gap-2 mb-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-linear-to-r ' + currentTourStep.color
                    : index < currentStep
                    ? 'bg-green-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-full bg-linear-to-br ${currentTourStep.color} flex items-center justify-center mb-4 mx-auto`}>
            <Icon className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
            {currentTourStep.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-4 text-center">
            {currentTourStep.description}
          </p>

          {/* Details */}
          {currentTourStep.details && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <ul className="space-y-2">
                {currentTourStep.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className={`flex-1 px-4 py-2.5 bg-linear-to-r ${currentTourStep.color} text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-md`}
            >
              {currentStep < tourSteps.length - 1 ? 'Next' : 'Get Started!'}
            </button>
          </div>

          {/* Skip button */}
          {currentStep < tourSteps.length - 1 && (
            <button
              onClick={onClose}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
