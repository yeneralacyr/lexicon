import {
  createWebSession,
  getWebSessionSummary,
  getWebSettings,
  getWebWords,
  markWebSessionItemRated,
  setWebSessionCompletedItems,
} from '@/db/web-store';
import type { Rating } from '@/types/progress';
import type { BuildDailySessionResult, ReviewDashboardSnapshot } from '@/modules/review/review.types';
import { createSessionId, pickPromptType } from '@/utils/random';
import type { SessionSummary } from '@/types/session';

export async function getDashboardSnapshot(): Promise<ReviewDashboardSnapshot> {
  const words = getWebWords();
  const settings = getWebSettings();
  const recommendedCount = settings.dailyNewLimit;

  return {
    totalWords: words.length,
    dueToday: 0,
    newWords: words.length,
    learningWords: 0,
    masteredWords: 0,
    studiedWords: 0,
    recommendedCount,
    estimatedMinutes: Math.max(1, Math.ceil(recommendedCount / 4)),
    streakDays: 0,
  };
}

export async function buildDailySession(mode: 'daily' | 'review_only' | 'new_only' = 'daily'): Promise<BuildDailySessionResult | null> {
  const settings = getWebSettings();
  const selectedWords = getWebWords().slice(0, settings.dailyNewLimit);

  if (selectedWords.length === 0) {
    return null;
  }

  const sessionId = createSessionId();

  createWebSession(
    sessionId,
    selectedWords.map((word, index) => ({
      id: index + 1,
      wordId: word.id,
      english: word.english,
      turkish: word.turkish,
      sentence: word.sentence1 ?? null,
      orderIndex: index,
      promptType: pickPromptType(index),
    })),
    selectedWords.length,
    mode === 'review_only' ? 0 : selectedWords.length,
    mode === 'new_only' ? 0 : 0
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
  markWebSessionItemRated(params.sessionId, params.sessionItemId, params.rating);
  setWebSessionCompletedItems(params.sessionId, params.completedItems);
}

export async function finalizeSession() {
  return null;
}

export async function getSessionSummarySnapshot(sessionId: string): Promise<SessionSummary | null> {
  return getWebSessionSummary(sessionId);
}
