'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { type Activity } from '@/lib/api/activity';
import { weeklyPlanAPI, type CreateWeeklyPlanData, type WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChipTabs } from '@/components/ui/ChipTabs';
import LoadingScreen from '@/components/ui/LoadingScreen';
import {
  ActivityPickCard,
  ConfigureActivityCard,
  PlanStepProgress,
} from '@/components/create-plan/CreatePlanUI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, PlusCircle } from 'lucide-react';
import CadenceSlider, { type CadenceValue } from '@/components/ui/CadenceSlider';
import { cn } from '@/lib/utils';

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
      <LoadingScreen fullScreen label="Loading plan creator…" />
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
  const [tiers, setTiers] = useState<number>(1);
  const [repeatLoading, setRepeatLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'body' | 'mind' | 'soul'>('body');
  const [visitedCategories, setVisitedCategories] = useState<Set<'body' | 'mind' | 'soul'>>(new Set(['body']));
  const [targetOverlayActivity, setTargetOverlayActivity] = useState<Activity | null>(null);
  const [weight, setWeight] = useState<number>(selectedProfile?.profile?.weight || 0);
  const [showWeightOverlay, setShowWeightOverlay] = useState(false);
  const [mandatoryActivity, setMandatoryActivity] = useState<Activity | null>(null);
  const [showCongratulation, setShowCongratulation] = useState(false);
  const [surpriseActivity, setSurpriseActivity] = useState<{name: string, icon: string, targetValue: number, unit: string} | null>(null);
  const [surpriseActivityStatus, setSurpriseActivityStatus] = useState<'assigned' | 'none-left' | 'not-configured' | 'none'>('none');
  const planInitRef = useRef(false);

  function apiErrorMessage(err: unknown, fallback: string) {
    const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (status === 429) {
      return 'Too many requests. Please wait a minute and try again.';
    }
    return message || fallback;
  }

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
      planInitRef.current = false;
      router.push('/login');
      return;
    }

    if (planInitRef.current) return;
    planInitRef.current = true;

    // Check if an upcoming plan already exists
    const checkUpcomingPlan = async () => {
      try {
        const upcomingPlan = await weeklyPlanAPI.getUpcomingPlan();
        if (upcomingPlan) {
          router.push('/upcoming');
          return;
        }
      } catch (err) {
        console.log('No upcoming plan found, user can create one', err);
      }
    };

    void checkUpcomingPlan();
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
      setError(apiErrorMessage(error, 'Failed to load activities. Please try again.'));
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
      const repeatResponse = await weeklyPlanAPI.repeatLastWeek();

      const createdPlan = repeatResponse?.data?.data;
      const now = new Date();
      const weekStart = createdPlan?.weekStart ? new Date(createdPlan.weekStart) : null;
      const weekEnd = createdPlan?.weekEnd ? new Date(createdPlan.weekEnd) : null;
      const isCurrentWeekPlan = !!(weekStart && weekEnd && weekStart <= now && weekEnd >= now);

      // If repeated plan is already active, take user to Home. Otherwise show Upcoming plan.
      router.replace(isCurrentWeekPlan ? '/home' : '/upcoming');
    } catch (error: unknown) {
      console.error('Failed to repeat last week:', error);
      setError(apiErrorMessage(error, 'Failed to repeat last week\'s plan. You may not have a previous plan.'));
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
          setSurpriseActivityStatus('assigned');
          setSurpriseActivity({
            name: surprise.label || surprise.activity,
            icon: activities.find(a => a._id === surprise.activity)?.icon || '🎁',
            targetValue: surprise.targetValue,
            unit: surprise.unit
          });
        } else {
          setSurpriseActivityStatus(createdPlan.surpriseActivityStatus || 'none');
          setSurpriseActivity(null);
        }
      }
      
      // Show congratulation screen
      setShowCongratulation(true);
    } catch (error: unknown) {
      console.error('Failed to create weekly plan:', error);
      setError(apiErrorMessage(error, `Failed to ${isOnboarding ? 'save your first plan' : 'create weekly plan'}. Please try again.`));
    } finally {
      setLoading(false);
    }
  };

  // Congratulation Screen
  if (showCongratulation) {
    return (
      <MainLayout hideBottomNav={isOnboarding}>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="app-card w-full max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Plan created</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your weekly plan is ready.</p>

            {surpriseActivity ? (
              <div className="mt-4 rounded-xl border border-border bg-primary-soft/50 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Bonus activity</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-2xl">{surpriseActivity.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{surpriseActivity.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Target {surpriseActivity.targetValue} {surpriseActivity.unit}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {surpriseActivityStatus === 'none-left'
                  ? 'No bonus activity left for this week.'
                  : 'Your selected activities are locked in for the week.'}
              </p>
            )}

            <Button
              onClick={() => {
                const dayOfWeek = new Date().getDay();
                router.replace(dayOfWeek === 1 ? '/tasks' : '/upcoming');
              }}
              className="mt-6 w-full"
            >
              View your plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const stepTitle =
    step === 'choice'
      ? 'Choose plan type'
      : step === 'select'
        ? 'Select activities'
        : isOnboarding
          ? 'Review your first plan'
          : 'Configure your plan';

  const stepSubtitle =
    step === 'choice'
      ? 'Create a new plan or repeat last week.'
      : step === 'select'
        ? `Browse ${selectedCategory} activities and pick at least 4.`
        : isOnboarding
          ? 'Confirm targets and enter your weight.'
          : 'Review targets before creating your plan.';

  return (
    <MainLayout hideBottomNav={isOnboarding}>
      <div className="create-plan-header space-y-4">
        <PageHeader
          title={stepTitle}
          subtitle={stepSubtitle}
          action={
            isOnboarding ? (
              <span className="chip chip-active text-xs">Setup</span>
            ) : undefined
          }
        />

        <PlanStepProgress step={step} />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Step 0: Choose Plan Type */}
        {step === 'choice' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={handleChoiceCreateNew}
                className="section-card p-5 text-left transition-colors hover:bg-accent/40"
              >
                <span className="inline-flex rounded-xl bg-primary-soft p-2.5 text-primary">
                  <PlusCircle className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">Create new plan</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick activities and set fresh targets for the week.
                </p>
                <span className="mt-3 inline-flex items-center text-sm font-semibold text-primary">
                  Start creating <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={handleChoiceRepeatLast}
                disabled={repeatLoading}
                className="section-card p-5 text-left transition-colors hover:bg-accent/40 disabled:opacity-60"
              >
                <span className="inline-flex rounded-xl bg-secondary p-2.5 text-foreground">
                  <RefreshCw className={cn('h-5 w-5', repeatLoading && 'animate-spin')} />
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">Repeat last plan</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reuse the same activities and targets from last week.
                </p>
                <span className="mt-3 inline-flex items-center text-sm font-semibold text-foreground">
                  {repeatLoading ? 'Loading…' : 'Repeat plan'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Select Activities */}
        {step === 'select' && (
          <div className="activity-list space-y-4">
            <div className="section-card p-4">
              <ChipTabs
                className="community-tabs mb-2"
                tabs={[
                  { id: 'body', label: 'Body' },
                  { id: 'mind', label: 'Mind' },
                  { id: 'soul', label: 'Soul' },
                ]}
                active={selectedCategory}
                onChange={(id) => handleCategoryChange(id as 'body' | 'mind' | 'soul')}
              />
              <p className="text-xs text-muted-foreground">
                Use Next/Back to move through categories, or tap to jump.
              </p>
            </div>

            <div className="app-card flex items-center justify-between p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{selectedActivities.length}</span> selected
              </p>
              <span className="text-xs text-muted-foreground">Minimum 4</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredActivities.map((activity) => {
                const isSelected = selectedActivities.some((a) => a.activityId === activity._id);
                const isMandatory = mandatoryActivity && activity._id === mandatoryActivity._id;
                return (
                  <ActivityPickCard
                    key={activity._id}
                    icon={activity.icon}
                    name={activity.name}
                    unit={activity.baseUnit}
                    selected={isSelected}
                    mandatory={Boolean(isMandatory)}
                    onClick={() => toggleActivity(activity)}
                  />
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {selectedCategory === 'body'
                  ? isOnboarding
                    ? 'Back'
                    : 'Back to choice'
                  : selectedCategory === 'mind'
                    ? 'Body'
                    : 'Mind'}
              </Button>
              <Button onClick={handleNext} className="flex-1">
                {selectedCategory === 'body'
                  ? 'Next: Mind'
                  : selectedCategory === 'mind'
                    ? 'Next: Soul'
                    : 'Next: Configure'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Activities */}
        {step === 'configure' && (
          <div className="configure-step space-y-4">
            {selectedActivities.map((activity) => {
              const isMandatory = mandatoryActivity && activity.activityId === mandatoryActivity._id;

              return (
                <ConfigureActivityCard
                  key={activity.activityId}
                  icon={activity.icon}
                  name={activity.name}
                  unit={activity.baseUnit}
                  cadence={activity.cadence}
                  targetValue={activity.targetValue}
                  mandatory={Boolean(isMandatory)}
                />
              );
            })}

            <div className="section-card p-4">
              <p className="text-sm font-semibold text-foreground">Your weight</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Used to personalize your weekly plan.
              </p>
              <label className="mt-3 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
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
                placeholder="e.g. 70"
                className="target-input mt-1.5 w-full max-w-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">Range: 1 – 500 kg</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !weight || weight <= 0}
                className="create-button flex-1"
              >
                {loading
                  ? isOnboarding
                    ? 'Saving plan…'
                    : 'Creating plan…'
                  : isOnboarding
                    ? 'Save & continue'
                    : 'Create weekly plan'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Weight Input Overlay for Repeat Last Week */}
      {showWeightOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          onClick={() => setShowWeightOverlay(false)}
        >
          <div className="app-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Enter your weight</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your weight to personalize the repeated plan.
            </p>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
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
              placeholder="e.g. 70"
              className="mt-1.5 w-full"
              autoFocus
            />
            <div className="mt-4 flex gap-3">
              <Button onClick={() => setShowWeightOverlay(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={confirmRepeatWithWeight}
                disabled={repeatLoading || !weight || weight <= 0}
                className="flex-1"
              >
                {repeatLoading ? 'Processing…' : 'Confirm & repeat'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {targetOverlayActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          onClick={() => {
            const isMandatory = mandatoryActivity && targetOverlayActivity._id === mandatoryActivity._id;
            if (!isMandatory) setTargetOverlayActivity(null);
          }}
        >
          <div className="app-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl">
                {targetOverlayActivity.icon}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{targetOverlayActivity.name}</h3>
                <p className="text-sm text-muted-foreground">Set your target for this activity</p>
              </div>
            </div>
            <TargetSelectionForm
              activity={targetOverlayActivity}
              tiers={tiers}
              isMandatory={mandatoryActivity?._id === targetOverlayActivity._id}
              onConfirm={confirmActivitySelection}
              onCancel={() => setTargetOverlayActivity(null)}
            />
          </div>
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
  const isWeeklyNumericTarget = cadence === 'weekly' && activity.baseUnit.toLowerCase() !== 'days';
  const effectiveMaxVal = isWeeklyNumericTarget ? maxVal * 7 : maxVal;

  const handleConfirm = () => {
    if (targetValue < minVal || targetValue > effectiveMaxVal || cadence === 'none') {
      return;
    }
    onConfirm(targetValue, cadence as 'daily' | 'weekly');
  };

  return (
    <div className="space-y-4">
      {/* Mandatory Activity Notice */}
      {isMandatory && (
        <div className="rounded-xl border border-success/30 bg-success-soft/40 p-3">
          <p className="text-sm font-semibold text-foreground">Required activity</p>
          <p className="text-xs text-muted-foreground">Configure a target to continue.</p>
        </div>
      )}

      {activity.allowedCadence.length > 1 ? (
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Cadence</label>
          <CadenceSlider value={cadence} onChange={(value) => setCadence(value)} disabled={false} />
        </div>
      ) : (
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Cadence</label>
          <div className="rounded-xl border border-border bg-secondary px-4 py-3">
            <span className="text-sm font-semibold capitalize text-foreground">{cadence}</span>
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Target ({activity.baseUnit})
        </label>
        <Input
          type="number"
          step="any"
          min={minVal}
          max={effectiveMaxVal}
          value={targetValue || ''}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
            setTargetValue(value);
          }}
          onBlur={(e) => {
            const value = parseFloat(e.target.value);
            if (isNaN(value) || value < minVal) {
              setTargetValue(minVal);
            } else if (value > effectiveMaxVal) {
              setTargetValue(effectiveMaxVal);
            }
          }}
          placeholder={`Enter target in ${activity.baseUnit}`}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Range: {minVal} – {effectiveMaxVal} {activity.baseUnit}
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
          disabled={targetValue < minVal || targetValue > effectiveMaxVal || !targetValue || cadence === 'none'}
          className={isMandatory ? "w-full" : "flex-1"}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
