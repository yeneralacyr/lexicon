import type { SessionPhase } from '@/types/session';
import type { ThemeMode } from '@/constants/theme';

export type DashboardSnapshot = {
  totalWords: number;
  dueToday: number;
  newWords: number;
  learningWords: number;
  masteredWords: number;
  studiedWords: number;
  recommendedCount: number;
  estimatedMinutes: number;
  streakDays: number;
  todayReviewedCount: number;
  todayNewCount: number;
  dailyFreeNewLimit: number;
  todayFreeNewUnlocked: number;
  todayRewardedNewUnlocked: number;
  todayRemainingFreeNew: number;
  canUnlockExtraNewWords: boolean;
  completedToday: number;
  activeSessionId: string | null;
  activeSessionPhase: SessionPhase | null;
  activeSessionCompletedItems: number;
  activeSessionTotalItems: number;
};

export type DailyUnlocks = {
  date: string;
  freeNewUnlockedCount: number;
  rewardedNewUnlockedCount: number;
};

export type AppOverview = {
  dbVersion: string;
  seedVersion: string;
  wordCount: number;
  storageMode: 'sqlite-native';
  seededAt: string | null;
  activeSessionId: string | null;
};

export type StudySettings = {
  dailyNewLimit: number;
  dailyReviewLimit: number;
  meaningRevealSeconds: number;
  sessionGoalMinutes: number;
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  themeMode: ThemeMode;
};

export type SqliteExportValue = string | number | null;

export type SqliteExportRow = Record<string, SqliteExportValue>;

export type ProgressExportPayload = {
  generatedAt: string;
  appMeta: SqliteExportRow[];
  appSettings: SqliteExportRow[];
  wordProgress: SqliteExportRow[];
  sessions: SqliteExportRow[];
  sessionItems: SqliteExportRow[];
  sessionQuizItems: SqliteExportRow[];
  dailyStats: SqliteExportRow[];
  dailyUnlocks: SqliteExportRow[];
};
