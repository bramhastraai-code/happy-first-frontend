'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthStore, Profile } from '@/lib/store/authStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Heart, Users } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function SelectProfilePage() {
  const router = useRouter();
  const { user, profiles, setSelectedProfile, isHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (profiles?.length === 1) {
      setSelectedProfile(profiles[0] || null);
      router.push('/home');
    }
  }, [user, isHydrated, router, setSelectedProfile, profiles]);

  const handleSelectProfile = (profile: Profile) => {
    setLoading(true);
    setSelectedProfile(profile);
    setTimeout(() => router.push('/home'), 300);
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship.toLowerCase()) {
      case 'self':
        return <User className="h-7 w-7" />;
      case 'spouse':
      case 'partner':
        return <Heart className="h-7 w-7" />;
      default:
        return <Users className="h-7 w-7" />;
    }
  };

  const getLevelBadgeColor = (level?: string) => {
    switch (level) {
      case 'bronze':
        return 'bg-amber-700';
      case 'silver':
        return 'bg-stone-400';
      case 'gold':
        return 'bg-yellow-500';
      case 'diamond':
        return 'bg-orange-400';
      case 'legend':
        return 'bg-primary';
      default:
        return 'bg-stone-500';
    }
  };

  if (!isHydrated || !user) {
    return <LoadingScreen fullScreen label="Loading profiles…" />;
  }

  const familyMembers = profiles || [];
  const canAddMore = familyMembers.length < 5;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" size="md" />
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Who&apos;s using the app?</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Select a profile to continue</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {familyMembers.map((profile) => (
              <Card
                key={profile._id}
                className="cursor-pointer app-card-hover transition-all hover:border-primary"
                onClick={() => handleSelectProfile(profile)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    {getRelationshipIcon(profile.relationship || 'self')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">{profile.name}</h3>
                    <p className="text-sm capitalize text-muted-foreground">{profile.relationship || 'self'}</p>
                    {profile.level && (
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${getLevelBadgeColor(profile.level)}`}>
                        {profile.level}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {canAddMore && (
              <Card
                className="cursor-pointer border-dashed app-card-hover hover:border-primary"
                onClick={() => router.push('/settings?panel=add-family')}
              >
                <div className="flex h-full min-h-[88px] items-center justify-center gap-2 p-4 text-muted-foreground transition-colors hover:text-primary">
                  <UserPlus className="h-5 w-5" />
                  <span className="font-medium">Add family member</span>
                </div>
              </Card>
            )}
          </div>

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {familyMembers.length}/5 profiles used
          </p>
        </div>
      </div>
    </div>
  );
}
