import api from './axios';

export interface CoinHistoryRow {
  id: string;
  amount: number;
  direction: 'credit' | 'debit';
  reason: string;
  reference: string;
  balanceAfter: number;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface RedeemCatalogItem {
  id: string;
  title: string;
  cost: number | null;
  kind: string;
  available: boolean;
}

export interface CoinDashboard {
  balance: number;
  earned: number;
  redeemed: number;
  platformSharePercent: number;
  platformTotal: number;
  catalog: RedeemCatalogItem[];
  history: CoinHistoryRow[];
}

export interface XpLevelRow {
  level: number;
  title: string;
  totalXp: number;
  approxTime: string;
  memberCount: number;
  reached: boolean;
  current: boolean;
}

export interface XpDashboard {
  totalXp: number;
  level: number;
  levelTitle: string;
  nextLevel: {
    level: number;
    title: string;
    totalXp: number;
    remaining: number;
  } | null;
  todayXp: number;
  dailyGoal: number;
  personalBest: { day: number; week: number; month: number };
  sources: { activity: string; xp: number }[];
  prediction: {
    averageXpPerDay: number;
    estimatedDaysRemaining: number | null;
  };
  levels: XpLevelRow[];
}

export interface EconomySummary {
  coins: {
    balance: number;
    earned: number;
    redeemed: number;
    platformSharePercent: number;
  };
  xp: {
    totalXp: number;
    level: number;
    levelTitle: string;
    todayXp: number;
    dailyGoal: number;
    nextLevel: XpDashboard['nextLevel'];
    personalBest: XpDashboard['personalBest'];
  };
}

export interface LevelMember {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  avatarSeed: string | null;
  avatarStyle: string;
  totalXp: number;
  levelTitle: string;
}

export const economyAPI = {
  summary: () => api.get<{ success: boolean; data: EconomySummary }>('/economy/summary'),
  coins: () => api.get<{ success: boolean; data: CoinDashboard }>('/economy/coins'),
  xp: () => api.get<{ success: boolean; data: XpDashboard }>('/economy/xp'),
  redeem: (catalogId: string) =>
    api.post<{ success: boolean; data: unknown }>('/economy/coins/redeem', { catalogId }),
  levelMembers: (level: number, params?: { limit?: number; skip?: number }) =>
    api.get<{ success: boolean; data: { level: number; members: LevelMember[] } }>(
      `/economy/xp/levels/${level}/members`,
      { params }
    ),
};
