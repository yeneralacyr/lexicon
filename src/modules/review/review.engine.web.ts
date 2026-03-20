import type { BuildDailySessionResult, ReviewDashboardSnapshot } from '@/modules/review/review.types';
import type { SessionDecision, SessionQuizDetail, SessionSummary } from '@/types/session';

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

export async function applySessionDecision(_: {
  sessionId: string;
  sessionItemId: number;
  wordId: number;
  decision: SessionDecision;
  durationMs: number;
  currentOrderIndex: number;
  selectedSentenceIndex: number | null;
}) {
  unsupported();
}

export async function beginSessionQuiz(_: string) {
  unsupported();
}

export async function getSessionQuizSnapshot(_: string): Promise<SessionQuizDetail | null> {
  unsupported();
}

export async function submitSessionQuizAnswer(_: {
  sessionId: string;
  wordId: number;
  answer: string;
  expectedNormalizedMeaning: string;
  durationMs: number;
}) {
  unsupported();
}

export async function finalizeQuizSession(_: string) {
  unsupported();
}

export async function finalizeSession(_: string) {
  unsupported();
}

export async function getSessionSummarySnapshot(_: string): Promise<SessionSummary | null> {
  unsupported();
}
