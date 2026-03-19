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
};

export type AppOverview = {
  dbVersion: string;
  seedVersion: string;
  wordCount: number;
};

export type StudySettings = {
  dailyNewLimit: number;
  dailyReviewLimit: number;
  sessionGoalMinutes: number;
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
};
