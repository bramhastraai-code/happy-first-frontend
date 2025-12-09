'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Share2 } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Referral', href: '/referral', icon: Share2 },
  { name: 'Community', href: '/community', icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-screen-lg mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
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
  );
}
