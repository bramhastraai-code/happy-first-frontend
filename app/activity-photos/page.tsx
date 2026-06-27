'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Camera, ImageIcon, MessageCircle, User } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { activityPhotosAPI, type ActivityPhoto } from '@/lib/api/activityPhotos';
import { useAuthStore } from '@/lib/store/authStore';
import { BRAND_NAME } from '@/lib/brand';

type PhotoTab = 'all' | 'mine';

function profileName(photo: ActivityPhoto): string {
  if (typeof photo.profile === 'object' && photo.profile?.name) return photo.profile.name;
  return 'Member';
}

function userName(photo: ActivityPhoto): string | null {
  if (typeof photo.user === 'object' && photo.user?.name) return photo.user.name;
  return null;
}

function PhotoCard({ photo, onOpen }: { photo: ActivityPhoto; onOpen: () => void }) {
  const name = profileName(photo);
  const uploadedBy = userName(photo);
  const dateLabel = DateTime.fromISO(photo.createdAt).toFormat('MMM dd, yyyy');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.imageUrl}
          alt={photo.caption || `${name} activity photo`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-white/80">{dateLabel}</p>
        </div>
      </div>
      <div className="space-y-1 p-3">
        {photo.caption ? (
          <p className="line-clamp-2 text-sm text-foreground">{photo.caption}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Activity moment</p>
        )}
        {uploadedBy && uploadedBy !== name && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {uploadedBy}
          </p>
        )}
      </div>
    </button>
  );
}

function PhotoLightbox({ photo, onClose }: { photo: ActivityPhoto; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-float)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.imageUrl}
          alt={photo.caption || 'Activity photo'}
          className="max-h-[65vh] w-full object-contain bg-black"
        />
        <div className="space-y-1 p-4">
          <p className="font-semibold text-foreground">{profileName(photo)}</p>
          {photo.caption && <p className="text-sm text-muted-foreground">{photo.caption}</p>}
          <p className="text-xs text-muted-foreground">
            {DateTime.fromISO(photo.createdAt).toFormat('cccc, MMM dd, yyyy · h:mm a')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPhotosPage() {
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  const [tab, setTab] = useState<PhotoTab>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<ActivityPhoto | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['activityPhotos', tab, selectedProfile?._id],
    enabled: isHydrated && !!accessToken,
    queryFn: async () => {
      const response =
        tab === 'mine' ? await activityPhotosAPI.getMine() : await activityPhotosAPI.getAll();
      return response.data.data ?? [];
    },
  });

  const photos = data ?? [];
  const errorMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : 'Failed to load photos');

  const subtitle = useMemo(() => {
    if (tab === 'mine' && selectedProfile?.name) {
      return `Photos shared by ${selectedProfile.name} via WhatsApp`;
    }
    return 'Community activity moments shared through the WhatsApp bot';
  }, [tab, selectedProfile?.name]);

  if (!isHydrated) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading photos…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Activity photos" subtitle={subtitle} />

      <div className="section-card mb-5 flex gap-3 p-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Share from WhatsApp</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Open the {BRAND_NAME} WhatsApp bot menu and choose <strong>Upload Activity Photo</strong> to add yours to the gallery.
          </p>
        </div>
      </div>

      <ChipTabs
        className="mb-5"
        tabs={[
          { id: 'all', label: 'Community' },
          { id: 'mine', label: 'My photos' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as PhotoTab)}
      />

      {isLoading ? (
        <LoadingScreen label="Loading activity photos…" />
      ) : isError ? (
        <div className="section-card p-6 text-center">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : photos.length === 0 ? (
        <div className="section-card flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            {tab === 'mine' ? <Camera className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            {tab === 'mine' ? 'No photos yet' : 'Gallery is empty'}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {tab === 'mine'
              ? 'Upload your first activity photo from the WhatsApp bot to see it here.'
              : 'When members share activity photos via WhatsApp, they will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            {photos.length} photo{photos.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <PhotoCard key={photo._id} photo={photo} onOpen={() => setSelectedPhoto(photo)} />
            ))}
          </div>
        </>
      )}

      {selectedPhoto && (
        <PhotoLightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </MainLayout>
  );
}
