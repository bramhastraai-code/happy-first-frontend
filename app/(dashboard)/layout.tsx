'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { userData, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
                {/* Navbar */}
                <nav className="bg-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl">😁</span>
                                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                                        Happy First Club
                                    </h1>
                                </div>
                                <div className="hidden md:flex gap-6">
                                    <a href="/dashboard" className="text-gray-700 hover:text-purple-600 font-medium transition">
                                        Dashboard
                                    </a>
                                    <a href="/dashboard/weekly-plan" className="text-gray-700 hover:text-purple-600 font-medium transition">
                                        Weekly Plan
                                    </a>
                                    <a href="/dashboard/daily-log" className="text-gray-700 hover:text-purple-600 font-medium transition">
                                        Daily Log
                                    </a>
                                    <a href="/dashboard/summary" className="text-gray-700 hover:text-purple-600 font-medium transition">
                                        Summary
                                    </a>
                                    <a href="/dashboard/leaderboard" className="text-gray-700 hover:text-purple-600 font-medium transition">
                                        Leaderboard
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-800">{userData?.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{userData?.level}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
