'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { type Activity } from '@/lib/api/activity';
import { weeklyPlanAPI, type CreateWeeklyPlanData, type WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Calendar, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import CadenceSlider, { type CadenceValue } from '@/components/ui/CadenceSlider';

interface SelectedActivity {
  activityId: string;
  name: string;
  cadence: 'daily' | 'weekly';
  targetValue: number;
  baseUnit: string;
  icon: string;
  values:[
    {
      tier:number;
      maxVal:number;
      minVal:number;
    }
  ]
  allowedCadence: ('daily' | 'weekly')[];
}

export default function CreatePlanPage() {
  return (
    <Suspense fallback={<CreatePlanPageFallback />}>
      <CreatePlanPageContent />
    </Suspense>
  );
}

function CreatePlanPageFallback() {
  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600"></div>
          <p className="text-gray-600">Loading plan creator...</p>
        </div>
      </div>
    </MainLayout>
  );
}

function CreatePlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('mode') === 'first-setup';
  const { user, accessToken, isHydrated,selectedProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<SelectedActivity[]>([]);
  const [step, setStep] = useState<'choice' | 'select' | 'configure'>(isOnboarding ? 'select' : 'choice');
  const [error, setError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentDay, setCurrentDay] = useState('');
  const [tiers, setTiers] = useState<number>(1);
  const [repeatLoading, setRepeatLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'body' | 'mind' | 'soul'>('body');
  const [visitedCategories, setVisitedCategories] = useState<Set<'body' | 'mind' | 'soul'>>(new Set(['body']));
  const [targetOverlayActivity, setTargetOverlayActivity] = useState<Activity | null>(null);
  const [weight, setWeight] = useState<number>(selectedProfile?.profile?.weight || 0);
  const [showWeightOverlay, setShowWeightOverlay] = useState(false);
  const [mandatoryActivity, setMandatoryActivity] = useState<Activity | null>(null);
  const [hasCurrentPlan, setHasCurrentPlan] = useState(false);
  const [showCongratulation, setShowCongratulation] = useState(false);
  const [surpriseActivity, setSurpriseActivity] = useState<{name: string, icon: string, targetValue: number, unit: string} | null>(null);

  useEffect(() => {
    if (!isOnboarding) {
      return;
    }

    fetchActivities();
    setStep('select');
  }, [isOnboarding]);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    // Check if an upcoming plan already exists
    const checkUpcomingPlan = async () => {
      try {
        const response = await weeklyPlanAPI.Upcomming();
        if (response.data.data) {
          // Upcoming plan exists, redirect to upcoming page
          router.push('/upcoming');
          return;
        }
      } catch {
        // No upcoming plan exists, continue
        console.log('No upcoming plan found, user can create one');
      }

      const today = new Date();
      const dayOfWeek = today.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setCurrentDay(dayNames[dayOfWeek]);

      if (isOnboarding) {
        setIsUnlocked(true);
        return;
      }
      
      // On Monday, check if there's already a current plan
      if (dayOfWeek === 1) {
        try {
          const currentPlanResponse = await weeklyPlanAPI.getCurrent();
          if (currentPlanResponse.data.data && currentPlanResponse.data.data.activities && currentPlanResponse.data.data.activities.length > 0) {
            // Current plan exists on Monday, show banner instead of allowing creation
            setHasCurrentPlan(true);
            setIsUnlocked(false);
            setCurrentDay(dayNames[dayOfWeek]);
            return;
          }
        } catch {
          // No current plan exists, continue
          console.log('No current plan found on Monday, user can create one');
        }
      }

      // Unlock on Friday (5), Saturday (6), Sunday (0), or Monday (1)
      const unlocked = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 || dayOfWeek === 2;
      setIsUnlocked(unlocked);

      // Don't automatically fetch activities - wait for user choice
    };

    checkUpcomingPlan();
  }, [accessToken, user, router, isHydrated, isOnboarding]);

  const fetchActivities = async () => {
    try {
      const response = await weeklyPlanAPI.getOptions();
      const fetchedActivities = response.data.data.activities;
      setActivities(fetchedActivities);
      setTiers(response.data.data.tier);
      
      // Find and auto-select the mandatory "happy days" activity
      const happyDaysActivity = fetchedActivities.find(
        (activity: Activity) => activity.name.toLowerCase() === 'happy days'
      );
      
      if (happyDaysActivity) {
        setMandatoryActivity(happyDaysActivity);
        // Open overlay for mandatory activity configuration
        // setTargetOverlayActivity(happyDaysActivity);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setError('Failed to load activities. Please try again.');
    }
  };

  const toggleActivity = (activity: Activity) => {
    const exists = selectedActivities.find((a) => a.activityId === activity._id);
    
    // Prevent deselection of mandatory activity
    if (exists && mandatoryActivity && activity._id === mandatoryActivity._id) {
      setError('"Happy Days" is a mandatory activity and cannot be removed from your plan.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (exists) {
      setSelectedActivities(selectedActivities.filter((a) => a.activityId !== activity._id));
      setTargetOverlayActivity(null);
    } else {
      // Open overlay for target selection instead of auto-adding
      setTargetOverlayActivity(activity);
    }
  };

  const confirmActivitySelection = (targetValue: number, cadence: 'daily' | 'weekly') => {
    if (!targetOverlayActivity) return;
    
    setSelectedActivities([
      ...selectedActivities,
      {
        activityId: targetOverlayActivity._id,
        name: targetOverlayActivity.name,
        cadence: cadence,
        targetValue: targetValue,
        baseUnit: targetOverlayActivity.baseUnit,
        values: targetOverlayActivity.values,
        allowedCadence: targetOverlayActivity.allowedCadence,
        icon: targetOverlayActivity.icon,
      },
    ]);
    setTargetOverlayActivity(null);
  };

  const filteredActivities = activities.filter(
    (activity) => activity.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  const handleCategoryChange = (category: 'body' | 'mind' | 'soul') => {
    setSelectedCategory(category);
    setVisitedCategories(prev => new Set([...prev, category]));
  };

  const handleNext = () => {
    // If in select step, navigate through categories first
    if (step === 'select') {
      // Navigate through categories: body → mind → soul → configure
      if (selectedCategory === 'body') {
        setSelectedCategory('mind');
        setVisitedCategories(prev => new Set([...prev, 'mind']));
        setError('');
        return;
      } else if (selectedCategory === 'mind') {
        setSelectedCategory('soul');
        setVisitedCategories(prev => new Set([...prev, 'soul']));
        setError('');
        return;
      } else if (selectedCategory === 'soul') {
        // Moving from soul to configure - validate activities
        const minRequired = mandatoryActivity ? 4 : 4;
        if (selectedActivities.length < minRequired) {
          setError(`Please select at least ${minRequired} activities (including Happy Days)`);
          return;
        }

        // Check if all categories have been visited
        if (visitedCategories.size < 3) {
          const allCategories: ('body' | 'mind' | 'soul')[] = ['body', 'mind', 'soul'];
          const unvisitedCategories = allCategories.filter(cat => !visitedCategories.has(cat));
          const categoryNames = unvisitedCategories.map(cat => 
            cat.charAt(0).toUpperCase() + cat.slice(1)
          );
          setError(`Please browse through all categories before proceeding. Not visited: ${categoryNames.join(', ')}`);
          return;
        }

        // Check if mandatory activity target has been set
        if (mandatoryActivity) {
          const mandatoryActivitySelected = selectedActivities.find(
            a => a.activityId === mandatoryActivity._id
          );
          
          if (!mandatoryActivitySelected) {
            // Ask for mandatory activity target if not yet configured
            setTargetOverlayActivity(mandatoryActivity);
            setError('');
            return;
          }
        }

        setError('');
        setStep('configure');
      }
    }
  };

  const handleBack = () => {
    if (step === 'configure') {
      // From configure, go back to soul category
      setStep('select');
      setSelectedCategory('soul');
    } else if (step === 'select') {
      // Navigate backwards through categories: soul → mind → body → choice
      if (selectedCategory === 'soul') {
        setSelectedCategory('mind');
        setError('');
      } else if (selectedCategory === 'mind') {
        setSelectedCategory('body');
        setError('');
      } else if (selectedCategory === 'body') {
        if (isOnboarding) {
          router.back();
        } else {
          setStep('choice');
          // Clear selected activities when going back to choice
          setSelectedActivities([]);
        }
      }
    }
    setError('');
  };

  const handleChoiceCreateNew = () => {
    fetchActivities();
    setStep('select');
    setError('');
  };

  const handleChoiceRepeatLast = () => {
    setShowWeightOverlay(true);
    setError('');
  };

  const confirmRepeatWithWeight = async () => {
    // Validate weight
    if (!weight || weight <= 0) {
      setError('Please enter your weight');
      return;
    }

    setRepeatLoading(true);
    setError('');
    setShowWeightOverlay(false);

    try {
      // Update profile with weight
      await authAPI.updateProfile({
        profile: {
          weight: weight,
        },
      });

      // Repeat last week's plan
      await weeklyPlanAPI.repeatLastWeek();
      
      // Redirect to upcoming page after successfully repeating last week's plan
      router.replace('/upcoming');
    } catch (error: unknown) {
      console.error('Failed to repeat last week:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(errorMessage || 'Failed to repeat last week\'s plan. You may not have a previous plan.');
    } finally {
      setRepeatLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate targets
    const hasInvalidTargets = selectedActivities.some((a) => a.targetValue === 0 || !a.targetValue);
    if (hasInvalidTargets) {
      setError('Please set target values for all selected activities');
      return;
    }

    // Validate weight
    if (!weight || weight <= 0) {
      setError('Please enter your weight');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update profile with weight
      await authAPI.updateProfile({
        profile: {
          weight: weight,
        },
      });

      // Create weekly plan with selected activities
      const planData: CreateWeeklyPlanData = {
        activities: selectedActivities.map((act) => ({
          activityId: act.activityId,
          cadence: act.cadence,
          targetValue: act.targetValue,
        })),
      };
      
      const response = isOnboarding
        ? await weeklyPlanAPI.firstSetup(planData)
        : await weeklyPlanAPI.create(planData);

      if (isOnboarding) {
        router.replace('/profile-setup');
        return;
      }
      
      // Check for surprise activity in the response
      const createdPlan = response.data?.data;
      if (createdPlan && createdPlan.activities) {
        const surprise = createdPlan.activities.find((act: WeeklyPlanActivity) => act.isSurpriseActivity === true);
        if (surprise) {
          setSurpriseActivity({
            name: surprise.label || surprise.activity,
            icon: activities.find(a => a._id === surprise.activity)?.icon || '🎁',
            targetValue: surprise.targetValue,
            unit: surprise.unit
          });
        } else {
          setSurpriseActivity(null);
        }
      }
      
      // Show congratulation screen
      setShowCongratulation(true);
    } catch (error: unknown) {
      console.error('Failed to create weekly plan:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(errorMessage || `Failed to ${isOnboarding ? 'save your first plan' : 'create weekly plan'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Locked state UI
  if (!isUnlocked) {
    // Show different UI if user already has a current plan
    if (hasCurrentPlan) {
      return (
        <MainLayout hideBottomNav={isOnboarding}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <CheckCircle2 className="w-20 h-20 mx-auto text-green-500 mb-4" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    You Already Have an Active Plan
                  </h1>
                  <p className="text-gray-600 mb-4">
                    You cannot create a new plan while you have an active weekly plan in progress
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <Calendar className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Your current plan is active
                  </p>
                  <p className="text-xs text-blue-700">
                    Complete your current week&apos;s activities. You can create a new plan starting next <span className="font-semibold">Friday</span>.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/home')}
                    className="w-full"
                    variant="default"
                  >
                    View Current Plan
                  </Button>
                  <Button
                    onClick={() => router.push('/home')}
                    className="w-full"
                    variant="outline"
                  >
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      );
    }
    
    const nextUnlockDay = currentDay === 'Monday' || currentDay === 'Tuesday' || currentDay === 'Wednesday' || currentDay === 'Thursday' 
      ? 'Friday' 
      : 'Friday';
    
    return (
      <MainLayout hideBottomNav={isOnboarding}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Lock className="w-20 h-20 mx-auto text-gray-400 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Plan Creation Locked
                </h1>
                <p className="text-gray-600 mb-4">
                  Weekly plan creation is only available on weekends
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                <Calendar className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Available Days
                </p>
                <div className="flex justify-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Friday
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Saturday
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Sunday
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Monday
                  </span>
                </div>
                <p className="text-xs text-blue-700">
                  Today is <span className="font-semibold">{currentDay}</span>
                </p>
              </div>

              <div className="text-sm text-gray-600 mb-6">
                <p>Next unlock: <span className="font-semibold text-gray-900">{nextUnlockDay}</span></p>
              </div>

              <Button
                onClick={() => router.push('/home')}
                className="w-full"
                variant="default"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Congratulation Screen
  if (showCongratulation) {
    return (
      <MainLayout hideBottomNav={isOnboarding}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Congratulations!
                </h1>
                <p className="text-gray-600 mb-4">
                  Your weekly plan has been created successfully
                </p>
              </div>

              {surpriseActivity ? (
                <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-6 mb-6 border-2 border-purple-200">
                  <div className="mb-3">
                    <div className="text-5xl mb-2">🎁</div>
                    <h2 className="text-xl font-bold text-purple-900 mb-1">
                      Surprise Activity!
                    </h2>
                    <p className="text-sm text-purple-700">
                      We&apos;ve added a special activity to your plan
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="text-3xl">{surpriseActivity.icon}</span>
                      <h3 className="text-lg font-bold text-gray-900">
                        {surpriseActivity.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Target: <span className="font-semibold text-purple-700">
                        {surpriseActivity.targetValue} {surpriseActivity.unit}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
                  <div className="text-4xl mb-3">📋</div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    No Surprise Activity
                  </h2>
                  <p className="text-sm text-gray-600">
                    Your plan includes all the activities you selected. Keep up the great work!
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    // If Monday (1), go to tasks, otherwise go to upcoming
                    router.replace(dayOfWeek === 1 ? '/tasks' : '/upcoming');
                  }}
                  className="w-full"
                  variant="default"
                >
                  View Your Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideBottomNav={isOnboarding}>
      <div className="p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="create-plan-header mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 'choice' && 'Choose Plan Type'}
              {step === 'select' && 'Select Activities'}
              {step === 'configure' && (isOnboarding ? 'Review Your First Plan' : 'Configure Your Plan')}
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{isOnboarding ? 'Setup Mode' : 'Unlocked'}</span>
            </div>
          </div>
          <p className="text-gray-600">
            {step === 'choice' && 'Would you like to create a new plan or repeat your last week\'s plan?'}
            {step === 'select' && `${isOnboarding ? 'Build your first weekly plan by browsing' : 'Browse'} ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} activities and select the ones you want to include`}
            {step === 'configure' && (isOnboarding ? 'Confirm your selected activities and add your weight to finish setup' : 'Set your target values and cadence for each activity')}
          </p>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-2 rounded-full ${step === 'choice' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <div className={`flex-1 h-2 rounded-full ${step === 'select' ? 'bg-blue-500' : step === 'configure' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`flex-1 h-2 rounded-full ${step === 'configure' ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Choose Plan Type */}
        {step === 'choice' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create New Plan Option */}
              <Card
                className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg group"
                onClick={handleChoiceCreateNew}
              >
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl mx-auto">✨</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600">
                        Create New Plan
                      </h3>
                      <p className="text-sm text-gray-600">
                        Select activities and set targets for a fresh weekly plan tailored to your goals
                      </p>
                    </div>
                    <Button className="w-full" variant="default">
                      Start Creating <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Repeat Last Plan Option */}
              <Card
                className="cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg group"
                onClick={handleChoiceRepeatLast}
              >
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl mx-auto">🔄</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600">
                        Repeat Last Plan
                      </h3>
                      <p className="text-sm text-gray-600">
                        Continue with the same activities and targets from your previous week
                      </p>
                    </div>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled={repeatLoading}
                    >
                      {repeatLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Repeat Plan
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Back Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => router.push(isOnboarding ? '/profile-setup' : '/home')}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {isOnboarding ? 'Skip for Now' : 'Back to Home'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Select Activities */}
        {step === 'select' && (
          <div className="space-y-4">
            
            {/* Category Selection */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Category Navigation</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleCategoryChange('body')}
                  className={`relative p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedCategory === 'body'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💪 Body
                  {visitedCategories.has('body') && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => handleCategoryChange('mind')}
                  className={`relative p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedCategory === 'mind'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🧠 Mind
                  {visitedCategories.has('mind') && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => handleCategoryChange('soul')}
                  className={`relative p-3 rounded-lg font-medium text-sm transition-all ${
                    selectedCategory === 'soul'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✨ Soul
                  {visitedCategories.has('soul') && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Use Next/Back buttons to navigate through categories, or click to jump directly
              </p>
            </div>

           

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between ">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Selected: {selectedActivities.length}</span> / Minimum: 4
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredActivities.map((activity) => {
                const isSelected = selectedActivities.some((a) => a.activityId === activity._id);
                const isMandatory = mandatoryActivity && activity._id === mandatoryActivity._id;
                return (
                  <Card
                    key={activity._id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? isMandatory
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow'
                    }`}
                    onClick={() => toggleActivity(activity)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{activity.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{activity.name}</h3>
                            {isMandatory && (
                              <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                MANDATORY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{activity.baseUnit}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className={`w-6 h-6 ${isMandatory ? 'text-green-600' : 'text-blue-600'}`} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> 
                {selectedCategory === 'body' ? (isOnboarding ? 'Back' : 'Back to Choice') : selectedCategory === 'mind' ? 'Body' : 'Mind'}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                {selectedCategory === 'body' ? 'Next: Mind' : selectedCategory === 'mind' ? 'Next: Soul' : 'Next: Configure'} 
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Activities */}
        {step === 'configure' && (
          <div className="space-y-4">
            {selectedActivities.map((activity) => {
              const isMandatory = mandatoryActivity && activity.activityId === mandatoryActivity._id;
              
              return (
                <Card key={activity.activityId} className={`${isMandatory ? 'border-green-300 bg-green-50' : 'border-blue-100 bg-linear-to-br from-blue-50 to-indigo-50'}`}>
                  <CardContent className="p-5">
                    {/* Header Section */}
                    <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div className="text-4xl">{activity.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-lg">{activity.name}</h3>
                          {isMandatory && (
                            <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded-full">
                              MANDATORY
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Unit: {activity.baseUnit}</p>
                      </div>
                    </div>

                    {/* Details Section - Read-only Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Cadence Display */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Cadence
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {activity.cadence.charAt(0).toUpperCase() + activity.cadence.slice(1)}
                          </span>
                         
                        </div>
                      </div>

                      {/* Target Value Display */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Target Value
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {activity.targetValue}
                          </span>
                          <span className="text-sm font-medium text-gray-600">
                            {activity.baseUnit}
                          </span>
                        </div>
                      </div>
                    </div>

                    
                  </CardContent>
                </Card>
              );
            })}

            {/* Weight Input */}
            <Card className="bg-linear-to-r from-green-50 to-blue-50 border-2 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚖️</span>
                    <h3 className="font-semibold text-gray-900">Your Weight</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Please enter your current weight to help us personalize your plan
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="500"
                      value={weight || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setWeight(value);
                      }}
                      placeholder="Enter your weight in kg"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1 - 500 kg
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !weight || weight <= 0}
                className="flex-1"
              >
                {loading ? (isOnboarding ? 'Saving Plan...' : 'Creating Plan...') : (isOnboarding ? 'Save & Continue' : 'Create Weekly Plan')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Weight Input Overlay for Repeat Last Week */}
      {showWeightOverlay && (
        <div
          className="fixed inset-0 backdrop-blur-2xl bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowWeightOverlay(false)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">⚖️</span>
                  <h3 className="text-xl font-bold text-gray-900">
                    Enter Your Weight
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  Please update your current weight to personalize your weekly plan
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="500"
                    value={weight || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setWeight(value);
                    }}
                    placeholder="Enter your weight in kg"
                    className="w-full"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Range: 1 - 500 kg
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setShowWeightOverlay(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmRepeatWithWeight}
                    disabled={repeatLoading || !weight || weight <= 0}
                    className="flex-1"
                  >
                    {repeatLoading ? 'Processing...' : 'Confirm & Repeat'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Target Selection Overlay */}
      {targetOverlayActivity && (
        <div
          className="fixed inset-0 backdrop-blur-2xl  bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            // Prevent closing if it's the mandatory activity
            const isMandatory = mandatoryActivity && targetOverlayActivity._id === mandatoryActivity._id;
            if (!isMandatory) {
              setTargetOverlayActivity(null);
            }
          }}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-4xl">{targetOverlayActivity.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {targetOverlayActivity.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Set your target for this activity
                  </p>
                </div>
              </div>

              <TargetSelectionForm
                activity={targetOverlayActivity}
                tiers={tiers}
                isMandatory={mandatoryActivity?._id === targetOverlayActivity._id}
                onConfirm={confirmActivitySelection}
                onCancel={() => setTargetOverlayActivity(null)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}

// Target Selection Form Component
function TargetSelectionForm({
  activity,
  tiers,
  isMandatory = false,
  onConfirm,
  onCancel,
}: {
  activity: Activity;
  tiers: number;
  isMandatory?: boolean;
  onConfirm: (targetValue: number, cadence: 'daily' | 'weekly') => void;
  onCancel: () => void;
}) {
  const [targetValue, setTargetValue] = useState<number>(
    activity.values.find(v => v.tier === tiers)?.minVal || 0
  );
  const [cadence, setCadence] = useState<CadenceValue>(
    activity.allowedCadence.length === 1 ? activity.allowedCadence[0] : 'none'
  );

  const minVal = activity.values.find(v => v.tier === tiers)?.minVal || 0;
  const maxVal = activity.values.find(v => v.tier === tiers)?.maxVal || 100;

  const handleConfirm = () => {
    if (targetValue < minVal || targetValue > maxVal || cadence === 'none') {
      return;
    }
    onConfirm(targetValue, cadence as 'daily' | 'weekly');
  };

  return (
    <div className="space-y-4">
      {/* Mandatory Activity Notice */}
      {isMandatory && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-green-900 mb-1">
            ⚠️ Mandatory Activity
          </p>
          <p className="text-xs text-green-700">
            This activity is required. Please configure your target to continue.
          </p>
        </div>
      )}

      {/* Cadence Selection */}
      {activity.allowedCadence.length > 1 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cadence
          </label>
          <CadenceSlider
            value={cadence}
            onChange={(value) => setCadence(value)}
            disabled={false}
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cadence
          </label>
          <div className="w-full px-4 py-3 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-semibold text-blue-900">
              {cadence.charAt(0).toUpperCase() + cadence.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Target Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Value ({activity.baseUnit})
        </label>
        <Input
          type="number"
          step="any"
          min={minVal}
          max={maxVal}
          value={targetValue || ''}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
            setTargetValue(value);
          }}
          onBlur={(e) => {
            const value = parseFloat(e.target.value);
            if (isNaN(value) || value < minVal) {
              setTargetValue(minVal);
            } else if (value > maxVal) {
              setTargetValue(maxVal);
            }
          }}
          placeholder={`Enter target in ${activity.baseUnit}`}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Range: {minVal} - {maxVal} {activity.baseUnit}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {!isMandatory && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          disabled={targetValue < minVal || targetValue > maxVal || !targetValue || cadence === 'none'}
          className={isMandatory ? "w-full" : "flex-1"}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
