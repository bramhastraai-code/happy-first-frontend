'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { activityPhotosAPI, type ActivityPhoto } from '@/lib/api/activityPhotos';
import { useAuthStore } from '@/lib/store/authStore';

export default function ActivityPhotosPage() {
  const { selectedProfile, accessToken } = useAuthStore();
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    const load = async () => {
      try {
        const res = await activityPhotosAPI.getAll();
        setPhotos(res.data.data || []);
      } catch (err) {
        setError((err as Error).message || 'Failed to load photos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken]);

  return (
    <MainLayout>
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Activity Photos</h1>
        <p className="text-gray-600 text-sm">
          Photos shared by members via WhatsApp. Upload yours from the bot menu: *Upload Activity Photo*.
        </p>
        {selectedProfile && (
          <p className="text-sm text-indigo-600">Viewing as {selectedProfile.name}</p>
        )}
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => {
            const profileName =
              typeof photo.profile === 'object' ? photo.profile.name : 'Member';
            return (
              <div key={photo._id} className="bg-white rounded-lg shadow overflow-hidden">
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || 'Activity photo'}
                  className="w-full h-40 object-cover"
                />
                <div className="p-2 text-xs text-gray-600">
                  <p className="font-medium">{profileName}</p>
                  <p>{new Date(photo.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
        {!loading && photos.length === 0 && (
          <p className="text-gray-500">No activity photos yet.</p>
        )}
      </div>
    </MainLayout>
  );
}
