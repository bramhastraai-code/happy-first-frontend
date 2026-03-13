'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivitySelectionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/create-plan?mode=first-setup');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50 p-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">Opening plan setup...</p>
      </div>
    </div>
  );
}
