import type { DashboardSnapshot } from '@/types/db';

export type BuildDailySessionResult = {
  id: string;
  totalItems: number;
};

export type ReviewDashboardSnapshot = DashboardSnapshot;
