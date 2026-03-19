import { getDatabase } from '@/db';
import { getDashboardSnapshotQuery } from '@/db/queries';
import {
  applyWordRatingOnDatabase,
  getDueWordCandidatesRepository,
  getStudySettingsRepository,
  recordDailyStatsOnDatabase,
} from '@/modules/progress/progress.repository';
import type { BuildDailySessionResult, ReviewDashboardSnapshot } from '@/modules/review/review.types';
import {
  completeSessionRepository,
  createSessionItemsOnDatabase,
  createSessionOnDatabase,
  getActiveSessionRepository,
  getSessionItemContextOnDatabase,
  getSessionSummaryRepository,
  markSessionItemRatedOnDatabase,
  setSessionCompletedItemsOnDatabase,
} from '@/modules/sessions/sessions.repository';
import { getNewWordCandidatesRepository } from '@/modules/words/words.repository';
import type { Rating } from '@/types/progress';
import type { SessionSummary } from '@/types/session';
import { createSessionId, pickPromptType } from '@/utils/random';

export type SessionMode = 'daily' | 'review_only' | 'new_only';

export async function getDashboardSnapshot(): Promise<ReviewDashboardSnapshot> {
  const db = await getDatabase();
  return getDashboardSnapshotQuery(db);
}

function pickSelectedSentenceIndex(sentences: string[], orderIndex: number) {
  if (sentences.length === 0) {
    return null;
  }

  return (orderIndex % sentences.length) + 1;
}

export async function buildDailySession(mode: SessionMode = 'daily'): Promise<BuildDailySessionResult | null> {
  const activeSession = await getActiveSessionRepository();

  if (activeSession) {
    return {
      id: activeSession.id,
      totalItems: activeSession.totalItems,
      resumed: true,
    };
  }

  const settings = await getStudySettingsRepository();
  const dueWords = mode === 'new_only' ? [] : await getDueWordCandidatesRepository(settings.dailyReviewLimit);
  const newWords = mode === 'review_only' ? [] : await getNewWordCandidatesRepository(settings.dailyNewLimit);
  const selectedWords = [...dueWords, ...newWords];

  if (selectedWords.length === 0) {
    return null;
  }

  const sessionId = createSessionId();
  const db = await getDatabase();

  await db.execAsync('BEGIN');

  try {
    await createSessionOnDatabase(db, {
      id: sessionId,
      sessionType: mode,
      totalItems: selectedWords.length,
      newItems: newWords.length,
      reviewItems: dueWords.length,
    });

    await createSessionItemsOnDatabase(
      db,
      selectedWords.map((word, index) => ({
        sessionId,
        wordId: word.id,
        orderIndex: index,
        promptType: pickPromptType(index),
        selectedSentenceIndex: pickSelectedSentenceIndex(word.sentences, index),
      }))
    );

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  return {
    id: sessionId,
    totalItems: selectedWords.length,
    resumed: false,
  };
}

export async function applySessionRating(params: {
  sessionId: string;
  sessionItemId: number;
  wordId: number;
  rating: Rating;
  completedItems: number;
  durationMs: number;
}) {
  const db = await getDatabase();

  await db.execAsync('BEGIN');

  try {
    const sessionItem = await getSessionItemContextOnDatabase(db, params.sessionItemId);

    if (!sessionItem || sessionItem.session_id !== params.sessionId || sessionItem.word_id !== params.wordId) {
      throw new Error('Session item not found for rating.');
    }

    if (sessionItem.result_rating) {
      await db.execAsync('ROLLBACK');
      return null;
    }

    const ratingResult = await applyWordRatingOnDatabase(db, params.wordId, params.rating);
    await markSessionItemRatedOnDatabase(db, params.sessionItemId, params.rating, params.durationMs);
    await setSessionCompletedItemsOnDatabase(db, params.sessionId, params.completedItems);
    await recordDailyStatsOnDatabase(db, {
      isNew: ratingResult.wasNew,
      rating: params.rating,
      durationMs: params.durationMs,
    });

    await db.execAsync('COMMIT');
    return ratingResult.record;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function finalizeSession(sessionId: string) {
  await completeSessionRepository(sessionId);
}

export async function getSessionSummarySnapshot(sessionId: string): Promise<SessionSummary | null> {
  return getSessionSummaryRepository(sessionId);
}
