import type { SessionPhase, SessionType } from '@/types/session';
import type { DashboardSnapshot } from '@/types/db';

export type BuildDailySessionResult = {
  id: string;
  totalItems: number;
  resumed: boolean;
  phase: SessionPhase;
  sessionType: SessionType;
};

export type ReviewDashboardSnapshot = DashboardSnapshot;
