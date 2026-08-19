'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import {
  AppPageHeader,
  headerActionBtnDangerClass,
} from '@/components/ui/AppPageHeader';
import {
  Lock,
  User,
  UserPlus,
  Users,
  ChevronRight,
  LogOut,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Loader2,
  Bell,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { authAPI } from '@/lib/api/auth';
import { useLogoutConfirm } from '@/lib/hooks/useLogoutConfirm';
import type { Profile } from '@/lib/store/authStore';
import ReminderScheduleEditor from '@/components/settings/ReminderScheduleEditor';
import AddFamilyMemberForm from '@/components/settings/AddFamilyMemberForm';
import EditProfileForm from '@/components/settings/EditProfileForm';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import SupportFeedbackForm from '@/components/settings/SupportFeedbackForm';
import PushNotificationToggle from '@/components/settings/PushNotificationToggle';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { AppQuickLinks } from '@/components/nav/AppQuickLinks';
import { Button } from '@/components/ui/button';
import {
  mergeReminderSchedule,
  ReminderSchedule,
  getEnabledReminderCount,
  hasValidReminderSchedule,
  getReminderScheduleIssues,
} from '@/lib/utils/reminderSchedule';
import { firstNameFrom, getTimeGreeting } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';
const PAUSE_ALLOWED_DAY_INDEXES = [5, 6, 0, 1];
const MAX_FAMILY_MEMBERS = 5;

type SettingsPanel =
  | 'add-family'
  | 'edit-profile'
  | 'reminders'
  | 'password'
  | 'support'
  | null;

const getPauseStatus = (profile: Profile | null): boolean => {
  if (!profile) return false;
  return Boolean(profile.pause ?? profile.setting?.pause);
};

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    profiles,
    selectedProfile,
    setProfiles,
    setSelectedProfile,
    logout,
  } = useAuthStore();
  const [userData, setUserData] = useState<typeof user | null>(null);
  const [isPauseEnabled, setIsPauseEnabled] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseError, setPauseError] = useState('');
  const [reminderSchedule, setReminderSchedule] = useState<ReminderSchedule>(
    mergeReminderSchedule(selectedProfile?.reminderSchedule, selectedProfile?.reminderTime)
  );
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [openPanel, setOpenPanel] = useState<SettingsPanel>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const currentDayIndex = new Date().getDay();
  const canChangePauseToday = PAUSE_ALLOWED_DAY_INDEXES.includes(currentDayIndex);
  const hasFamilyMembers = profiles && profiles.length > 1;
  const familyCount = profiles?.length ?? 0;

  const togglePanel = (panel: Exclude<SettingsPanel, null>) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  useEffect(() => {
    const panel = new URLSearchParams(window.location.search).get('panel');
    const valid: Exclude<SettingsPanel, null>[] = [
      'add-family',
      'edit-profile',
      'reminders',
      'password',
      'support',
    ];
    if (panel && valid.includes(panel as Exclude<SettingsPanel, null>)) {
      setOpenPanel(panel as Exclude<SettingsPanel, null>);
    }
  }, []);

  const { requestLogout, LogoutConfirmDialog } = useLogoutConfirm();

  const handleDeleteAccount = async (confirmation: string) => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await authAPI.deleteAccount(confirmation);
      try {
        await authAPI.logout();
      } catch {
        // Session may already be invalid after delete
      }
      logout();
      setDeleteOpen(false);
      router.replace('/login');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete account. Please try again.';
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!accessToken) return;
      try {
        const userInfo = await authAPI.userInfo();
        setUserData(userInfo.data.data);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserData();
  }, [accessToken]);

  useEffect(() => {
    setIsPauseEnabled(getPauseStatus(selectedProfile));
  }, [selectedProfile]);

  useEffect(() => {
    setReminderSchedule(
      mergeReminderSchedule(selectedProfile?.reminderSchedule, selectedProfile?.reminderTime)
    );
  }, [selectedProfile]);

  const handleSaveReminders = async () => {
    if (!selectedProfile || reminderSaving) return;

    if (!hasValidReminderSchedule(reminderSchedule)) {
      setReminderError(getReminderScheduleIssues(reminderSchedule)[0]);
      setReminderMessage('');
      return;
    }

    setReminderSaving(true);
    setReminderMessage('');
    setReminderError('');

    try {
      const response = await authAPI.updateProfile({
        reminderSchedule,
        reminderTime: reminderSchedule.night.time,
      });
      const updatedProfiles = response.data.data.profiles as Profile[];
      setProfiles(updatedProfiles);
      const updated = updatedProfiles.find((p) => p._id === selectedProfile._id) || null;
      setSelectedProfile(updated);
      setReminderMessage('Reminder schedule saved.');
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setReminderError(message || 'Failed to save reminder schedule. Please try again.');
    } finally {
      setReminderSaving(false);
    }
  };

  const updateProfilePauseInStore = (pauseValue: boolean, updatedProfile?: Profile) => {
    const profileFromResponse =
      updatedProfile && updatedProfile._id === selectedProfile?._id ? updatedProfile : null;

    const nextSelectedProfile =
      profileFromResponse ??
      (selectedProfile
        ? {
            ...selectedProfile,
            pause: pauseValue,
            setting: {
              ...selectedProfile.setting,
              pause: pauseValue,
            },
          }
        : null);

    if (nextSelectedProfile) {
      setSelectedProfile(nextSelectedProfile);
    }

    if (profiles && selectedProfile) {
      setProfiles(
        profiles.map((profile) =>
          profile._id === selectedProfile._id
            ? {
                ...profile,
                ...(profileFromResponse ?? {}),
                pause: pauseValue,
                setting: {
                  ...profile.setting,
                  pause: pauseValue,
                },
              }
            : profile
        )
      );
    }
  };

  const handlePauseToggle = async () => {
    if (!selectedProfile || pauseLoading) return;

    if (!canChangePauseToday) {
      setPauseError('Pause can only be changed on Friday, Saturday, Sunday, or Monday.');
      return;
    }

    const nextPauseValue = !isPauseEnabled;
    setPauseLoading(true);
    setPauseError('');

    try {
      const response = await authAPI.updatePause(selectedProfile._id, { pause: nextPauseValue });
      const updatedProfile = response?.data?.data as Profile | undefined;
      setIsPauseEnabled(nextPauseValue);
      updateProfilePauseInStore(nextPauseValue, updatedProfile);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPauseError(message || 'Failed to update pause status. Please try again.');
    } finally {
      setPauseLoading(false);
    }
  };

  const profileFields = selectedProfile
    ? [
        selectedProfile.profile?.profession,
        selectedProfile.profile?.challenges,
        selectedProfile.profile?.goals,
        selectedProfile.profile?.likes,
        selectedProfile.profile?.personalCare,
        selectedProfile.profile?.dislikes,
        selectedProfile.profile?.medicalConditions,
        selectedProfile.profile?.health,
        selectedProfile.profile?.family,
        selectedProfile.profile?.schedule,
      ]
    : [];
  const completedFields = profileFields.filter(
    (field) => field !== null && field !== undefined && field !== ''
  ).length;
  const completionPercentage = profileFields.length
    ? Math.round((completedFields / profileFields.length) * 100)
    : 100;

  return (
    <MainLayout>
      <AppPageHeader
        title={
          <>
            {getTimeGreeting()},{' '}
            <span className="text-primary">
              {firstNameFrom(selectedProfile?.name || userData?.name || user?.name)}
            </span>
          </>
        }
        subtitle={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
        subtitleTone="label"
        meta={
          <>
            <span className="inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary sm:text-xs">
              Settings
            </span>
            {selectedProfile?.createdAt ? (
              <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Member since{' '}
                {new Date(selectedProfile.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' · '}
                {Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(selectedProfile.createdAt).getTime()) /
                      (24 * 60 * 60 * 1000)
                  )
                )}{' '}
                days
              </span>
            ) : null}
            {userData?.phoneNumber ? (
              <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {userData.phoneNumber}
              </span>
            ) : null}
            {userData?.email ? (
              <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {userData.email}
              </span>
            ) : null}
          </>
        }
        actions={
          <button
            type="button"
            onClick={requestLogout}
            className={headerActionBtnDangerClass}
            aria-label="Log out"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        }
      />

      <div className="space-y-4">
        {selectedProfile && completionPercentage < 100 && (
          <div className="rounded-2xl border border-primary/20 bg-primary-soft p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Profile {completionPercentage}% complete
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Complete your lifestyle profile for better recommendations and earn 100 Happy
                    Coins (one-time). Meaningful updates later in a quarter earn 10 more coins.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setOpenPanel('edit-profile');
                  requestAnimationFrame(() => {
                    document.getElementById('edit-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
              >
                Complete profile
              </Button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {completedFields} of {profileFields.length} fields completed
            </p>
          </div>
        )}

        <section aria-label="Profile">
          <h2 className="section-title mb-3">Profile</h2>
          <div className="space-y-3">
            {hasFamilyMembers && (
              <div className="section-card px-4 py-3">
                <button
                  type="button"
                  onClick={() => router.push('/select-profile')}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Switch profile</p>
                    <p className="text-xs text-muted-foreground">Change active family member</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </div>
            )}

            <CollapsibleSection
              title="Add family member"
              subtitle={`${familyCount} of ${MAX_FAMILY_MEMBERS} profiles used`}
              icon={UserPlus}
              expanded={openPanel === 'add-family'}
              onToggle={() => togglePanel('add-family')}
            >
              <AddFamilyMemberForm />
            </CollapsibleSection>

            <CollapsibleSection
              id="edit-profile"
              title="Edit profile"
              subtitle={
                completionPercentage < 100
                  ? `${completionPercentage}% complete · earn 100 coins at 100%`
                  : 'Lifestyle, goals, and preferences'
              }
              icon={User}
              expanded={openPanel === 'edit-profile'}
              onToggle={() => togglePanel('edit-profile')}
            >
              <EditProfileForm />
            </CollapsibleSection>

            <CollapsibleSection
              id="reminder-schedule"
              title="Reminder schedule"
              badge={
                getEnabledReminderCount(reminderSchedule) === 0
                  ? 'None active'
                  : `${getEnabledReminderCount(reminderSchedule)} active`
              }
              icon={Bell}
              expanded={openPanel === 'reminders'}
              onToggle={() => togglePanel('reminders')}
              contentClassName="space-y-3"
            >
              <ReminderScheduleEditor schedule={reminderSchedule} onChange={setReminderSchedule} />
              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
                <Button
                  onClick={handleSaveReminders}
                  disabled={
                    !selectedProfile ||
                    reminderSaving ||
                    !hasValidReminderSchedule(reminderSchedule)
                  }
                  className="sm:w-auto"
                >
                  {reminderSaving ? 'Saving…' : 'Save schedule'}
                </Button>
                {reminderMessage && <p className="text-sm text-primary">{reminderMessage}</p>}
                {reminderError && <p className="text-sm text-destructive">{reminderError}</p>}
              </div>
            </CollapsibleSection>
          </div>
        </section>

        <PushNotificationToggle />

        <section aria-label="Pause service" className="section-card px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                isPauseEnabled ? 'bg-amber-100 text-amber-700' : 'bg-primary-soft text-primary'
              )}
            >
              {isPauseEnabled ? (
                <PauseCircle className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
            </span>
            <span className="shrink-0 text-sm font-semibold text-foreground">Pause service</span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isPauseEnabled ? 'bg-amber-500' : 'bg-primary'
                )}
                aria-hidden
              />
              {isPauseEnabled ? 'Paused' : 'Active'}
            </span>
            <button
              type="button"
              onClick={handlePauseToggle}
              disabled={!selectedProfile || !canChangePauseToday || pauseLoading}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors',
                isPauseEnabled ? 'bg-amber-500' : 'bg-primary',
                (!selectedProfile || !canChangePauseToday || pauseLoading) &&
                  'cursor-not-allowed opacity-50'
              )}
              title={
                !canChangePauseToday
                  ? 'Can only change on Fri, Sat, Sun, or Mon'
                  : isPauseEnabled
                    ? 'Resume service'
                    : 'Pause service'
              }
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform',
                  isPauseEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              >
                {pauseLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : isPauseEnabled ? (
                  <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5 text-primary" />
                )}
              </span>
            </button>
          </div>
          {pauseError && <p className="mt-2 text-xs text-destructive">{pauseError}</p>}
        </section>

        <section aria-label="Security">
          <h2 className="section-title mb-3">Security</h2>
          <CollapsibleSection
            title="Change password"
            subtitle="Update your account password"
            icon={Lock}
            expanded={openPanel === 'password'}
            onToggle={() => togglePanel('password')}
          >
            <ChangePasswordForm />
          </CollapsibleSection>
        </section>

        <section aria-label="Support">
          <h2 className="section-title mb-3">Support</h2>
          <CollapsibleSection
            title="Support & feedback"
            subtitle="Send feedback or report an issue"
            icon={MessageSquare}
            expanded={openPanel === 'support'}
            onToggle={() => togglePanel('support')}
          >
            <SupportFeedbackForm />
          </CollapsibleSection>
        </section>

        <section aria-label="App navigation">
          <h2 className="section-title mb-3">Explore app</h2>
          <AppQuickLinks
            exclude={[
              '/home',
              '/tasks',
              '/feed',
              '/community',
              '/referral',
              '/tracker',
              '/settings',
            ]}
          />
          <button
            type="button"
            onClick={() => {
              setDeleteError('');
              setDeleteOpen(true);
            }}
            className={cn(
              'mt-2 flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3.5 text-left transition-colors',
              'hover:border-destructive/30 hover:bg-destructive/5 active:bg-destructive/10'
            )}
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug text-destructive">
                Delete account
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                Permanently deactivate your account
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </section>

        <div className="rounded-2xl border border-dashed border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> You can manage up to 5 family
            member profiles. Each profile has its own progress and activity history.
          </p>
        </div>
      </div>
      {LogoutConfirmDialog}
      <DeleteAccountDialog
        open={deleteOpen}
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteOpen(false);
          setDeleteError('');
        }}
        onConfirm={(confirmation) => void handleDeleteAccount(confirmation)}
      />
    </MainLayout>
  );
}
