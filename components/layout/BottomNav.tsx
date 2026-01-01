'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Share2, PlusCircle, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { useAuthStore } from '@/lib/store/authStore';

const navigation = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Create Plan', href: '/create-plan', icon: PlusCircle },
  { name: 'Referral', href: '/referral', icon: Share2 },
  { name: 'Community', href: '/community', icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { accessToken } = useAuthStore();
  const [hasUpcomingPlan, setHasUpcomingPlan] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const checkUpcomingPlan = async () => {
      if (!accessToken) return;
      
      try {
        const response = await weeklyPlanAPI.Upcomming();
        setHasUpcomingPlan(!!response.data.data);
      } catch (error) {
        // No upcoming plan exists
        setHasUpcomingPlan(false);
      }
    };

    checkUpcomingPlan();
  }, [accessToken, pathname]);

  return (
    <>
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isCreatePlan = item.name === 'Create Plan';
              const isLocked = isCreatePlan && hasUpcomingPlan;
              
              if (isLocked) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setShowMessage(true)}
                    className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 cursor-not-allowed relative"
                  >
                    <Lock className="w-6 h-6" />
                    <span className="text-xs mt-1 font-medium">{item.name}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full ${
                    isActive ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : ''}`} />
                  <span className="text-xs mt-1 font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Message Modal */}
      {showMessage && (
        <div 
          className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowMessage(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <Lock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Plan Already Created
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                You already have an upcoming plan. You can create a new plan only after that.
              </p>
              <button
                onClick={() => {setShowMessage(false)
                window.location.href = '/upcoming';
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                See Upcoming Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
