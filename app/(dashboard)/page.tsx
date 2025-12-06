'use client';

import { useAuthStore } from '@/lib/store/authStore';

export default function DashboardPage() {
    const { userData } = useAuthStore();

    const stats = [
        {
            label: 'Total Points',
            value: userData?.stats?.totalPoints || 0,
            icon: '📈',
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-600'
        },
        {
            label: 'Current Streak',
            value: `${userData?.stats?.unbeatenStreaks || 0} days`,
            icon: '🔥',
            color: 'from-orange-500 to-red-600',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-600'
        },
        {
            label: 'Level',
            value: userData?.level || 'Newbie',
            icon: '⭐',
            color: 'from-blue-500 to-cyan-600',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-600'
        },
    ];

    const quickActions = [
        {
            title: 'Log Today\'s Activities',
            desc: 'Track your progress',
            icon: '📝',
            href: '/dashboard/daily-log',
            color: 'from-purple-500 to-purple-600'
        },
        {
            title: 'View Weekly Plan',
            desc: 'Check your goals',
            icon: '📅',
            href: '/dashboard/weekly-plan',
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: 'View Summary',
            desc: 'See your progress',
            icon: '📊',
            href: '/dashboard/summary',
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Leaderboard',
            desc: 'See rankings',
            icon: '🏆',
            href: '/dashboard/leaderboard',
            color: 'from-yellow-500 to-orange-600'
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 rounded-3xl p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-6xl animate-bounce-slow">👋</span>
                        <div>
                            <h1 className="text-5xl font-black mb-2">
                                Welcome back, {userData?.name}!
                            </h1>
                            <p className="text-purple-100 text-xl font-medium">
                                Ready to crush your wellness goals today?
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="glass-strong rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-2 border-white/50 group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-600 font-bold text-lg">{stat.label}</h3>
                            <div className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center text-3xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className={`text-5xl font-black ${stat.textColor} mb-2 capitalize`}>
                            {stat.value}
                        </p>
                        <div className={`h-1.5 w-0 group-hover:w-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-700`}></div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="glass-strong rounded-3xl p-8 shadow-xl border-2 border-white/50">
                <h2 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
                    <span className="text-4xl">⚡</span>
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {quickActions.map((action, index) => (
                        <a
                            key={index}
                            href={action.href}
                            className="group p-6 border-2 border-gray-200 rounded-2xl hover:border-transparent hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 bg-white relative overflow-hidden"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                            <div className="relative z-10">
                                <div className="text-5xl mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                                    {action.icon}
                                </div>
                                <h3 className="font-black text-xl text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
                                    {action.title}
                                </h3>
                                <p className="text-gray-600 text-sm">{action.desc}</p>
                                <div className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${action.color} rounded-full mt-4 transition-all duration-500`}></div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* Motivational Quote */}
            <div className="glass rounded-2xl p-8 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-start gap-4">
                    <span className="text-5xl">💪</span>
                    <div>
                        <p className="text-2xl font-bold text-gray-800 mb-2">
                            "Small daily improvements are the key to staggering long-term results."
                        </p>
                        <p className="text-gray-600 font-medium">Keep pushing forward! 🚀</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
