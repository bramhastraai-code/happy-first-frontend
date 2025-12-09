'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search } from 'lucide-react';

const trendingCommunities = [
  {
    id: 1,
    name: 'Yoga Masters',
    description: 'Daily yoga practices and mindfulness',
    members: 256,
    category: 'Yoga & Meditation',
    emoji: '🧘',
  },
  {
    id: 2,
    name: 'Stairway to Heaven',
    description: 'Skip the elevator, climb the floors',
    members: 167,
    category: 'Stairs Challenge',
    emoji: '🏢',
  },
  {
    id: 3,
    name: 'Hydration Heroes',
    description: 'Track water intake together',
    members: 523,
    category: 'Wellness',
    emoji: '💧',
  },
  {
    id: 4,
    name: 'Night Owls Fitness',
    description: 'For those who workout after sunset',
    members: 142,
    category: 'Fitness',
    emoji: '🦉',
  },
];

const myCommunities = [
  {
    id: 1,
    name: 'Mumbai Runners',
    description: 'Connect with local runners in Mumbai',
    members: 128,
    yourRank: 3,
    avgPoints: 87,
    weeklyGoal: 150,
    emoji: '🏃',
    badge: '🔥',
  },
  {
    id: 2,
    name: 'Corporate Wellness Warriors',
    description: 'Office wellness challenge group',
    members: 342,
    yourRank: 12,
    avgPoints: 92,
    weeklyGoal: 200,
    emoji: '💼',
    badge: '8d',
  },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'discover' | 'my-communities'>('discover');

  return (
    <MainLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Community</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
              activeTab === 'discover'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">🌍</span>
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my-communities')}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
              activeTab === 'my-communities'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">👥</span>
            My Communities
          </button>
        </div>

        {activeTab === 'discover' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search communities..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Trending Communities */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📈</span>
                Trending Communities
              </h2>
              <div className="space-y-3">
                {trendingCommunities.map((community) => (
                  <Card key={community.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-2xl">
                          {community.emoji}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{community.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{community.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {community.members} members
                            </span>
                            <span className="text-blue-600">• {community.category}</span>
                          </div>
                        </div>
                      </div>
                      <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                        Join Community
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-communities' && (
          <div className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-pink-50 border-pink-200">
                <CardContent className="p-3 text-center">
                  <p className="text-sm text-pink-700 mb-1">Total Communities</p>
                  <p className="text-2xl font-bold text-pink-900">3</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3 text-center">
                  <p className="text-sm text-purple-700 mb-1">Total Members</p>
                  <p className="text-2xl font-bold text-purple-900">559</p>
                </CardContent>
              </Card>
              <Card className="bg-cyan-50 border-cyan-200">
                <CardContent className="p-3 text-center">
                  <p className="text-sm text-cyan-700 mb-1">Best Rank</p>
                  <p className="text-2xl font-bold text-cyan-900">#3</p>
                </CardContent>
              </Card>
            </div>

            {/* My Communities List */}
            <div className="space-y-3">
              {myCommunities.map((community) => (
                <Card key={community.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center text-2xl">
                          {community.emoji}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{community.name}</h3>
                          <p className="text-xs text-gray-600">{community.description}</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <Users className="w-3 h-3" />
                      <span>{community.members} members</span>
                      <span className="ml-auto flex items-center gap-1">
                        <span>{community.badge}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-blue-700">Your Rank</p>
                        <p className="font-bold text-blue-900">#{community.yourRank}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-green-700">Avg Points</p>
                        <p className="font-bold text-green-900">{community.avgPoints}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-xs text-purple-700">Weekly Goal</p>
                        <p className="font-bold text-purple-900">{community.weeklyGoal}</p>
                      </div>
                    </div>

                    {community.id === 1 && (
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Members</h4>
                        <div className="space-y-1">
                          {[
                            { name: 'Vishal T.', rank: 1, points: 95 },
                            { name: 'Priya S.', rank: 2, points: 92 },
                            { name: 'You', rank: 3, points: 88 },
                          ].map((member) => (
                            <div key={member.rank} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {member.rank === 1 ? '🥇' : member.rank === 2 ? '🥈' : '🥉'}
                                </span>
                                <span className={member.name === 'You' ? 'font-semibold text-blue-600' : ''}>
                                  {member.name}
                                </span>
                                {member.name === 'You' && <span className="text-xs text-gray-500">Rank #{member.rank}</span>}
                              </div>
                              <span className="font-semibold text-blue-600">{member.points} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <span>ℹ️</span>
                        Last challenge: 10K Race completed by 45 members
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
