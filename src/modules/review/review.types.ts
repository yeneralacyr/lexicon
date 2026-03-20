import type { SessionPhase } from '@/types/session';
import type { DashboardSnapshot } from '@/types/db';

export type BuildDailySessionResult = {
  id: string;
  totalItems: number;
  resumed: boolean;
  phase: SessionPhase;
};

export type ReviewDashboardSnapshot = DashboardSnapshot;
