import type { BuildDailySessionResult, ReviewDashboardSnapshot } from '@/modules/review/review.types';
import type { Rating } from '@/types/progress';
import type { SessionSummary } from '@/types/session';

export type SessionMode = 'daily' | 'review_only' | 'new_only';

function unsupported(): never {
  throw new Error('Lexicon is supported on native builds only.');
}

export async function getDashboardSnapshot(): Promise<ReviewDashboardSnapshot> {
  unsupported();
}

export async function buildDailySession(_: SessionMode = 'daily'): Promise<BuildDailySessionResult | null> {
  unsupported();
}

export async function applySessionRating(_: {
  sessionId: string;
  sessionItemId: number;
  wordId: number;
  rating: Rating;
  completedItems: number;
  durationMs: number;
}) {
  unsupported();
}

export async function finalizeSession(_: string) {
  unsupported();
}

export async function getSessionSummarySnapshot(_: string): Promise<SessionSummary | null> {
  unsupported();
}
