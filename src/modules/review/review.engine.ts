import { getDatabase } from '@/db';
import { getDashboardSnapshotQuery } from '@/db/queries';
import { applyWordRating, getDueWordCandidates, getSettings } from '@/modules/progress/progress.service';
import {
  completeSession,
  createSession,
  createSessionItems,
  getSessionSummary,
  markSessionItemRated,
  setSessionCompletedItems,
} from '@/modules/sessions/sessions.service';
import { getNewWordCandidates } from '@/modules/words/words.service';
import type { Rating } from '@/types/progress';
import type { SessionSummary } from '@/types/session';
import type { BuildDailySessionResult, ReviewDashboardSnapshot } from '@/modules/review/review.types';
import { createSessionId, pickPromptType } from '@/utils/random';

export type SessionMode = 'daily' | 'review_only' | 'new_only';

export async function getDashboardSnapshot(): Promise<ReviewDashboardSnapshot> {
  const db = await getDatabase();
  return getDashboardSnapshotQuery(db);
}

export async function buildDailySession(mode: SessionMode = 'daily'): Promise<BuildDailySessionResult | null> {
  const settings = await getSettings();
  const dueWords =
    mode === 'new_only' ? [] : await getDueWordCandidates(settings.dailyReviewLimit);
  const newWords =
    mode === 'review_only' ? [] : await getNewWordCandidates(settings.dailyNewLimit);
  const selectedWords = [...dueWords, ...newWords];

  if (selectedWords.length === 0) {
    return null;
  }

  const sessionId = createSessionId();

  await createSession({
    id: sessionId,
    sessionType: mode,
    totalItems: selectedWords.length,
    newItems: newWords.length,
    reviewItems: dueWords.length,
  });

  await createSessionItems(
    selectedWords.map((word, index) => ({
      sessionId,
      wordId: word.id,
      orderIndex: index,
      promptType: pickPromptType(index),
    }))
  );

  return {
    id: sessionId,
    totalItems: selectedWords.length,
  };
}

export async function applySessionRating(params: {
  sessionId: string;
  sessionItemId: number;
  wordId: number;
  rating: Rating;
  completedItems: number;
}) {
  await markSessionItemRated(params.sessionItemId, params.rating);
  await applyWordRating(params.wordId, params.rating);
  await setSessionCompletedItems(params.sessionId, params.completedItems);
}

export async function finalizeSession(sessionId: string) {
  await completeSession(sessionId);
}

export async function getSessionSummarySnapshot(sessionId: string): Promise<SessionSummary | null> {
  return getSessionSummary(sessionId);
}
