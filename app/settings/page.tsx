'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import {
  AppPageHeader,
} from '@/components/ui/AppPageHeader';
import { HeaderIconButton } from '@/components/ui/HeaderIconAction';
import {
  Lock,
  User,
  UserPlus,
  Users,
  LogOut,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Loader2,
  Bell,
  AlertCircle,
  Trash2,
  Share2,
  Home,
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
import DefaultLandingSetting from '@/components/settings/DefaultLandingSetting';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { AppQuickLinks } from '@/components/nav/AppQuickLinks';
import { Button } from '@/components/ui/button';
import {
  SettingsGroup,
  SettingsRow,
  settingsBtnClass,
} from '@/components/settings/settingsUi';
import {
  mergeReminderSchedule,
  ReminderSchedule,
  getEnabledReminderCount,
  hasValidReminderSchedule,
  getReminderScheduleIssues,
} from '@/lib/utils/reminderSchedule';
import { cn } from '@/lib/utils';
import {
  DEFAULT_LANDING_OPTIONS,
  resolveDefaultLanding,
} from '@/lib/theme/mascotTheme';
const PAUSE_ALLOWED_DAY_INDEXES = [5, 6, 0, 1];
const MAX_FAMILY_MEMBERS = 5;

function defaultLandingSubtitle(path?: string | null) {
  const resolved = resolveDefaultLanding(path);
  const label =
    DEFAULT_LANDING_OPTIONS.find((opt) => opt.value === resolved)?.label ?? 'Happiness';
  return `Opens ${label} first`;
}

type SettingsPanel =
  | 'add-family'
  | 'edit-profile'
  | 'default-landing'
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
        title="Settings"
        subtitle="Manage your account"
        subtitleTone="plain"
        actions={
          <>
            <HeaderIconButton
              icon={<LogOut className="h-[18px] w-[18px]" />}
              caption="Log out"
              danger
              onClick={requestLogout}
            />
          </>
        }
      />

      <div className="space-y-6">
        {selectedProfile && completionPercentage < 100 && (
          <div className="rounded-none border border-[#dbdbdb] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Profile {completionPercentage}% complete
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Finish your lifestyle profile for better recs and 100 Happy Coins (one-time).
                    Meaningful quarterly updates earn 10 more.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className={cn('shrink-0', settingsBtnClass)}
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
            <div className="mt-3 h-1 overflow-hidden bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {completedFields} of {profileFields.length} fields completed
            </p>
          </div>
        )}

        <SettingsGroup label="Your account">
          {hasFamilyMembers ? (
            <SettingsRow
              icon={Users}
              title="Switch profile"
              subtitle="Change active family member"
              onClick={() => router.push('/select-profile')}
            />
          ) : null}

          <CollapsibleSection
            variant="list"
            title="Add family member"
            subtitle={`${familyCount} of ${MAX_FAMILY_MEMBERS} profiles used`}
            icon={UserPlus}
            expanded={openPanel === 'add-family'}
            onToggle={() => togglePanel('add-family')}
          >
            <AddFamilyMemberForm />
          </CollapsibleSection>

          <CollapsibleSection
            variant="list"
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
            <EditProfileForm
              onSaved={() => setOpenPanel(null)}
              onCancel={() => setOpenPanel(null)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            variant="list"
            id="default-landing"
            title="Default landing after login"
            subtitle={defaultLandingSubtitle(
              selectedProfile?.preferences?.defaultLanding
            )}
            icon={Home}
            expanded={openPanel === 'default-landing'}
            onToggle={() => togglePanel('default-landing')}
          >
            <DefaultLandingSetting />
          </CollapsibleSection>

          <CollapsibleSection
            variant="list"
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
            <div className="flex flex-col gap-2 border-t border-[#efefef] pt-4 sm:flex-row sm:items-center">
              <Button
                onClick={handleSaveReminders}
                disabled={
                  !selectedProfile ||
                  reminderSaving ||
                  !hasValidReminderSchedule(reminderSchedule)
                }
                className={cn('sm:w-auto', settingsBtnClass)}
              >
                {reminderSaving ? 'Saving…' : 'Save schedule'}
              </Button>
              {reminderMessage && <p className="text-sm text-primary">{reminderMessage}</p>}
              {reminderError && <p className="text-sm text-destructive">{reminderError}</p>}
            </div>
          </CollapsibleSection>
        </SettingsGroup>

        <SettingsGroup label="How you use Happy First">
          <PushNotificationToggle embedded />
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              {isPauseEnabled ? (
                <PauseCircle className="h-6 w-6 shrink-0 text-foreground" strokeWidth={1.75} />
              ) : (
                <PlayCircle className="h-6 w-6 shrink-0 text-foreground" strokeWidth={1.75} />
              )}
              <span className="min-w-0 flex-1 text-sm text-foreground">Pause service</span>
              <span className="shrink-0 text-xs text-neutral-400">
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
            {pauseError ? <p className="mt-2 text-xs text-destructive">{pauseError}</p> : null}
          </div>
        </SettingsGroup>

        <SettingsGroup label="Login and security">
          <CollapsibleSection
            variant="list"
            title="Change password"
            subtitle="Update your account password"
            icon={Lock}
            expanded={openPanel === 'password'}
            onToggle={() => togglePanel('password')}
          >
            <ChangePasswordForm
              phoneNumber={userData?.phoneNumber || user?.phoneNumber}
              countryCode={userData?.countryCode || user?.countryCode}
            />
          </CollapsibleSection>
        </SettingsGroup>

        <SettingsGroup label="More info and support">
          <CollapsibleSection
            variant="list"
            title="Support & feedback"
            subtitle="Send feedback or report an issue"
            icon={MessageSquare}
            expanded={openPanel === 'support'}
            onToggle={() => togglePanel('support')}
          >
            <SupportFeedbackForm />
          </CollapsibleSection>
          <SettingsRow
            icon={Share2}
            title="Refer friends"
            subtitle="Share Happy First and earn coins"
            href="/referral"
          />
          <AppQuickLinks
            variant="list"
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
          <SettingsRow
            icon={Trash2}
            title="Delete account"
            subtitle="Permanently deactivate your account"
            danger
            onClick={() => {
              setDeleteError('');
              setDeleteOpen(true);
            }}
          />
        </SettingsGroup>

        <p className="px-1 text-xs text-neutral-400">
          You can manage up to 5 family member profiles. Each profile has its own progress and
          activity history.
        </p>
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
