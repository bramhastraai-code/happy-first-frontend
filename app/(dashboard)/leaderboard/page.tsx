'use client';

import { useEffect, useState } from 'react';
import { useLeaderboardStore } from '@/lib/store/leaderboardStore';
import { useAuthStore } from '@/lib/store/authStore';

export default function LeaderboardPage() {
    const { leaderboard, isLoading, fetchLeaderboard } = useLeaderboardStore();
    const { userData } = useAuthStore();
    const [type, setType] = useState<'weekly' | 'all-time' | 'referral'>('weekly');

    useEffect(() => {
        fetchLeaderboard(type);
    }, [type, fetchLeaderboard]);

    if (isLoading && !leaderboard) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const rankings = leaderboard?.rankings || [];
    const topThree = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black text-gray-900 mb-4">Leaderboard</h1>
                <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                    {['weekly', 'all-time', 'referral'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setType(t as any)}
                            className={`px-6 py-2 rounded-lg font-bold capitalize transition-all ${type === t ? 'bg-white shadow-md text-purple-600' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Podium */}
            {topThree.length > 0 && (
                <div className="flex justify-center items-end gap-4 mb-12 h-64">
                    {/* 2nd Place */}
                    {topThree[1] && (
                        <div className="flex flex-col items-center w-1/3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="w-16 h-16 rounded-full bg-gray-200 border-4 border-white shadow-lg mb-2 flex items-center justify-center text-2xl font-bold text-gray-500">
                                {topThree[1].name.charAt(0)}
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold text-gray-800 truncate w-24">{topThree[1].name}</p>
                                <p className="text-sm text-purple-600 font-bold">{Math.round(topThree[1].score)} pts</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-xl h-32 flex items-end justify-center pb-4 shadow-lg">
                                <span className="text-4xl font-black text-gray-400 opacity-50">2</span>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {topThree[0] && (
                        <div className="flex flex-col items-center w-1/3 animate-slide-up z-10">
                            <div className="text-4xl mb-2">👑</div>
                            <div className="w-20 h-20 rounded-full bg-yellow-100 border-4 border-yellow-400 shadow-xl mb-2 flex items-center justify-center text-3xl font-bold text-yellow-600">
                                {topThree[0].name.charAt(0)}
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold text-gray-900 text-lg truncate w-32">{topThree[0].name}</p>
                                <p className="text-purple-600 font-black text-xl">{Math.round(topThree[0].score)} pts</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-xl h-48 flex items-end justify-center pb-4 shadow-xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                <span className="text-6xl font-black text-yellow-600 opacity-50">1</span>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {topThree[2] && (
                        <div className="flex flex-col items-center w-1/3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <div className="w-16 h-16 rounded-full bg-orange-100 border-4 border-white shadow-lg mb-2 flex items-center justify-center text-2xl font-bold text-orange-600">
                                {topThree[2].name.charAt(0)}
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold text-gray-800 truncate w-24">{topThree[2].name}</p>
                                <p className="text-sm text-purple-600 font-bold">{Math.round(topThree[2].score)} pts</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-xl h-24 flex items-end justify-center pb-4 shadow-lg">
                                <span className="text-4xl font-black text-orange-500 opacity-50">3</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {rest.map((user: any) => (
                    <div
                        key={user.user}
                        className={`
                            flex items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition
                            ${userData?._id === user.user ? 'bg-purple-50 hover:bg-purple-50' : ''}
                        `}
                    >
                        <div className="w-12 text-center font-bold text-gray-400 text-lg">#{user.rank}</div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold ml-4">
                            {user.name.charAt(0)}
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="font-bold text-gray-900">
                                {user.name}
                                {userData?._id === user.user && <span className="ml-2 text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">You</span>}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{user.level}</p>
                        </div>
                        <div className="font-black text-purple-600 text-lg">
                            {Math.round(user.score)} pts
                        </div>
                    </div>
                ))}

                {rest.length === 0 && topThree.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No rankings available yet. Be the first to join!
                    </div>
                )}
            </div>
        </div>
    );
}
