'use client';

import { useState, useEffect, use } from 'react';
import { leaderboardAPI, LeaderboardEntry } from '@/lib/api/leaderboard';
import { activityAPI, Activity } from '@/lib/api/activity';
import { authAPI } from '@/lib/api/auth';

type LeaderboardType = 'daily' | 'weekly';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('daily');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>(activities.length > 0 ? activities[0]._id : '');
  const [userId, setUserId] = useState<string>('');
  const [userRank, setUserRank] = useState<LeaderboardEntry|null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.userInfo();  
        setUserId(response.data.data._id);

      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);
  useEffect(() => {
    
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  useEffect(() => {
    if (selectedActivity === '') {
      return;
    }
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivity, activeTab]);
  const fetchActivity = async () => {
    const response = await activityAPI.getList();
    console.log(response);
    setActivities(response.data.data);
    setSelectedActivity(response.data.data[0]._id);
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
        setLeaderboardData(response.data.data);
        if(response.data.data){
          const rank = response.data.data.find(entry => entry.user._id === userId) || null;
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
      <div className="max-h-68 px-2 py-2 overflow-auto">
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
            {/* Daily/Weekly Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'daily'
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${activeTab === 'weekly'
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Weekly
              </button>
            </div>

            <select
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="mb-4 p-2 border border-gray-300 rounded-lg"
              value={selectedActivity}
            >
              {activities.map((activity, index) => {
                if (index == 0)
                  return <option key={activity._id} value={activity._id} >{activity.name}</option>
                else
                  return <option key={activity._id} value={activity._id}>{activity.name}</option>
              }

              )}
            </select>

            {leaderboardData.map((entry, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.02] ${entry.rank <= 3 ? 'ring-2 ring-offset-2 ring-purple-400' : ''
                  }`}
              >

                <div className="flex items-center p-2">
                  {/* Rank Badge */}
                  <div className="shrink-0 mr-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${entry.rank <= 3 ? getRankColor(entry.rank) : 'bg-gray-400'
                        }`}
                    >
                      {entry.rank <= 3 ? (
                        <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-md font-semibold text-gray-800 truncate">
                      {entry.user.name}
                    </h3>
                  </div>

                  {/* Points/Value */}
                  <div className="text-right">
                    <div className="text-2xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {entry.value.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {activities.find(activity => activity._id === selectedActivity)?.baseUnit}
                    </p>
                  </div>
                </div>

                {/* Decorative Line for Top 3 */}
                {entry.rank <= 3 && (
                  <div className={`h-1 ${getRankColor(entry.rank)}`}></div>
                )}
              </div>
            ))}

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

        {/* Your Rank Card (Optional - if you want to show user's position) */}
        {!loading && !error && leaderboardData.length > 0 && (
          <div className="mt-6 bg-linear-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white shadow-lg">
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Your Rank</p>
                <p className="text-2xl font-bold">Keep climbing! 🚀</p>
              </div>
              
              <div className="text-right">
                <p className="text-sm opacity-90">Total Leaders</p>
                <p className="text-2xl font-bold">{leaderboardData.length}</p>
              </div>
            </div>
            {userRank==null&&
              <p className="mt-2 text-sm">You are not ranked yet. Start completing activities to get on the leaderboard!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
