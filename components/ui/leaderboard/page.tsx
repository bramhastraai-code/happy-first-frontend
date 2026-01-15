'use client';

import { useState, useEffect, use } from 'react';
import { leaderboardAPI, LeaderboardEntry } from '@/lib/api/leaderboard';
import { activityAPI, Activity } from '@/lib/api/activity';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';

type LeaderboardType = 'daily' | 'weekly';

export default function LeaderboardPage() {
  const { selectedProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('weekly');
  const [leaderboardData, setLeaderboardData] = useState<{rank:number,user:{_id:string,name:string},value:number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userRank, setUserRank] = useState<{rank: number, user: { _id: string; name: string }, value: number} | null>(null);




  useEffect(() => {

    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);


  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivity, activeTab]);
  const fetchActivity = async () => {
    const response = await activityAPI.getList();
    console.log(response);
    setActivities(response.data.data);
    setSelectedActivity("");
  }

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (activeTab === 'weekly') {
        response = await leaderboardAPI.getWeekly(selectedActivity);

      } else {
        // Daily leaderboard
        response = await leaderboardAPI.getAllTime(selectedActivity);
      }
      console.log(response.data);
      if (response.data?.data) {
        setLeaderboardData(response.data.data.ranks);
        if (response.data.data) {
          const rank = response.data.data.ranks.find(entry => entry.user._id === selectedProfile?._id) || null;
          setUserRank(rank);
        }
      }
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };
  console.log(leaderboardData);
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default:
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
    }
  };



  return (
    <div className=''>
      <div className="max-h-150 px-2 py-2 overflow-auto">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>

          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Leaderboard List */}
        {!loading && !error && (
          <div className="space-y-3">
            <select
              onChange={(e) => setSelectedActivity(e.target.value)}
              className=" p-2 border border-gray-300 rounded-lg"
              value={selectedActivity}
            >
              {[(<option key={"key"} value="" >All Activities</option>), ...activities.sort((a, b) => a.name.localeCompare(b.name)).map((activity, index) => {
                
                  return <option key={activity._id} value={activity._id} >{activity.name}</option>
               
              }

              )]}
            </select>
            {/* Your Rank Card */}
            {!loading && !error && leaderboardData.length > 0 && (
              <div className="sticky top-0 z-10 mb-4">
                <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-2xl p-5 shadow-2xl border-2 border-white/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-purple-100 uppercase tracking-wider">Your Position</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {userRank ? `Rank #${userRank.rank}` : 'Not Ranked'} 🎯
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-purple-100 uppercase tracking-wider">Total Players</p>
                      <p className="text-2xl font-bold text-white mt-1">{leaderboardData.length}</p>
                    </div>
                  </div>
                  
                  {userRank == null ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                      <p className="text-sm text-white/90 text-center">
                        🚀 Start completing activities to get on the leaderboard!
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-xl border-3 border-white ${
                            userRank.rank <= 3 ? getRankColor(userRank.rank) : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          }`}>
                            {userRank.rank <= 3 ? (
                              <span className="text-3xl">{getRankIcon(userRank.rank)}</span>
                            ) : (
                              <span className="text-white">#{userRank.rank}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{userRank.user.name}</h3>
                            <p className="text-xs text-purple-100">You • Current Week</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-white drop-shadow-lg">
                            {userRank.value.toFixed(2)}
                          </div>
                          <p className="text-xs text-purple-100 font-medium mt-1">
                            {activities.find(activity => activity._id === selectedActivity)?.baseUnit || 'points'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {leaderboardData.map((entry, index) => {
              const isCurrentUser = entry.user._id === selectedProfile?._id;
              const isTop3 = entry.rank <= 3;
              
              return (
                <div
                  key={index}
                  className={`rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                    isCurrentUser 
                      ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 ring-4 ring-purple-500 ring-offset-2 shadow-2xl scale-[1.02]' 
                      : isTop3 
                      ? 'bg-white ring-2 ring-offset-2 ring-purple-300' 
                      : 'bg-white'
                  }`}
                >
                  {/* Current User Badge */}
                  {isCurrentUser && (
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 flex items-center justify-center gap-2">
                      <span className="text-white text-xs font-bold uppercase tracking-wider">👤 You</span>
                    </div>
                  )}

                  <div className="flex items-center p-4">
                    {/* Rank Badge */}
                    <div className="shrink-0 mr-4">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-xl border-4 transition-transform hover:scale-110 ${
                          isTop3 
                            ? `${getRankColor(entry.rank)} border-white` 
                            : isCurrentUser
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-200'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-200'
                        }`}
                      >
                        {isTop3 ? (
                          <span className="text-3xl drop-shadow-md">{getRankIcon(entry.rank)}</span>
                        ) : (
                          <span className="text-white text-lg">#{entry.rank}</span>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-lg font-bold truncate ${
                          isCurrentUser ? 'text-purple-900' : 'text-gray-800'
                        }`}>
                          {entry.user.name}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full uppercase">
                            You
                          </span>
                        )}
                      </div>
                      {isTop3 && !isCurrentUser && (
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">
                          {entry.rank === 1 ? '🏆 Champion' : entry.rank === 2 ? '🥈 Runner Up' : '🥉 Top Performer'}
                        </p>
                      )}
                    </div>

                    {/* Points/Value */}
                    <div className="text-right">
                      <div className={`text-3xl font-black ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'
                          : isTop3
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'
                          : 'text-gray-800'
                      }`}>
                        {entry.value.toFixed(2)}
                      </div>
                      <p className={`text-xs font-semibold mt-1 ${
                        isCurrentUser ? 'text-purple-600' : 'text-gray-500'
                      }`}>
                        {activities.find(activity => activity._id === selectedActivity)?.baseUnit || 'points'}
                      </p>
                    </div>
                  </div>

                  {/* Decorative Line */}
                  {(isTop3 || isCurrentUser) && (
                    <div className={`h-1.5 ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600' 
                        : getRankColor(entry.rank)
                    }`}></div>
                  )}
                </div>
              );
            })}

            {leaderboardData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-gray-500 text-lg">No leaderboard data yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Complete activities to appear on the leaderboard!
                </p>
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
}
