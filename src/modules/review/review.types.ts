import type { DashboardSnapshot } from '@/types/db';

export type BuildDailySessionResult = {
  id: string;
  totalItems: number;
  resumed: boolean;
};

export type ReviewDashboardSnapshot = DashboardSnapshot;
