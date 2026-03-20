import { getDatabase } from '@/db';
import { getDashboardSnapshotQuery } from '@/db/queries';
import {
  applyWordRatingOnDatabase,
  getDueWordCandidatesRepository,
  getStudySettingsRepository,
  recordDailyStatsOnDatabase,
} from '@/modules/progress/progress.repository';
import type { BuildDailySessionResult, ReviewDashboardSnapshot } from '@/modules/review/review.types';
import { pickMeaningfulPromptType } from '@/modules/review/session-prompts';
import {
  beginSessionQuizOnDatabase,
  completeSessionRepository,
  completeSessionOnDatabase,
  createSessionItemsOnDatabase,
  createSessionOnDatabase,
  getActiveSessionRepository,
  getSessionCompletedItemsOnDatabase,
  getSessionItemContextOnDatabase,
  getSessionQuizDetailRepository,
  getSessionQuizResultsOnDatabase,
  getSessionSummaryRepository,
  getSessionStudyRatingsOnDatabase,
  markSessionItemRatedOnDatabase,
  queueSessionReplayOnDatabase,
  saveSessionQuizAnswerOnDatabase,
  setSessionCompletedItemsOnDatabase,
} from '@/modules/sessions/sessions.repository';
import { getNewWordCandidatesRepository } from '@/modules/words/words.repository';
import type { Rating } from '@/types/progress';
import type { SessionDecision, SessionQuizDetail, SessionSummary } from '@/types/session';
import { normalizeSearchText } from '@/utils/normalize';
import { createSessionId } from '@/utils/random';

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
      phase: activeSession.phase,
    };
  }

  const settings = await getStudySettingsRepository();
  const dueWords = mode === 'new_only' ? [] : await getDueWordCandidatesRepository(settings.dailyReviewLimit);
  const newWords = mode === 'review_only' ? [] : await getNewWordCandidatesRepository(settings.dailyNewLimit);
  const selectedWords = [
    ...dueWords.map((word, index) => ({
      word,
      source: 'review' as const,
      sourceIndex: index,
    })),
    ...newWords.map((word, index) => ({
      word,
      source: 'new' as const,
      sourceIndex: index,
    })),
  ];

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
      selectedWords.map((entry, index) => ({
        sessionId,
        wordId: entry.word.id,
        orderIndex: index,
        promptType: pickMeaningfulPromptType({
          source: entry.source,
          sourceIndex: entry.sourceIndex,
          hasSentence: entry.word.sentences.length > 0,
        }),
        selectedSentenceIndex: pickSelectedSentenceIndex(entry.word.sentences, index),
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
    phase: 'study',
  };
}

function mapSessionDecisionToRating(decision: SessionDecision): Rating {
  switch (decision) {
    case 'already_knew':
      return 'easy';
    case 'memorized_now':
      return 'good';
    case 'show_again':
    default:
      return 'again';
  }
}

export async function applySessionDecision(params: {
  sessionId: string;
  sessionItemId: number;
  wordId: number;
  decision: SessionDecision;
  durationMs: number;
  currentOrderIndex: number;
  selectedSentenceIndex: number | null;
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

    const rating = mapSessionDecisionToRating(params.decision);
    const sessionProgress = await getSessionCompletedItemsOnDatabase(db, params.sessionId);

    if (!sessionProgress) {
      throw new Error('Session not found for decision.');
    }

    await markSessionItemRatedOnDatabase(db, params.sessionItemId, rating, params.durationMs);

    if (params.decision === 'show_again') {
      await queueSessionReplayOnDatabase(db, {
        sessionId: params.sessionId,
        wordId: params.wordId,
        afterOrderIndex: params.currentOrderIndex,
        selectedSentenceIndex: params.selectedSentenceIndex,
      });
    }

    await setSessionCompletedItemsOnDatabase(db, params.sessionId, sessionProgress.completed_items + 1);

    await db.execAsync('COMMIT');
    return { rating };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function beginSessionQuiz(sessionId: string) {
  const db = await getDatabase();
  await db.execAsync('BEGIN');

  try {
    await beginSessionQuizOnDatabase(db, sessionId);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function getSessionQuizSnapshot(sessionId: string): Promise<SessionQuizDetail | null> {
  return getSessionQuizDetailRepository(sessionId);
}

export async function submitSessionQuizAnswer(params: {
  sessionId: string;
  wordId: number;
  answer: string;
  expectedNormalizedMeaning: string;
  durationMs: number;
}) {
  const db = await getDatabase();
  await db.execAsync('BEGIN');

  try {
    const normalizedAnswer = normalizeSearchText(params.answer);
    const isCorrect = normalizedAnswer === params.expectedNormalizedMeaning;

    await saveSessionQuizAnswerOnDatabase(db, {
      sessionId: params.sessionId,
      wordId: params.wordId,
      userAnswer: params.answer,
      normalizedAnswer,
      isCorrect,
      durationMs: params.durationMs,
    });

    await db.execAsync('COMMIT');
    return { isCorrect, normalizedAnswer };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function finalizeQuizSession(sessionId: string) {
  const db = await getDatabase();
  await db.execAsync('BEGIN');

  try {
    const studyRows = await getSessionStudyRatingsOnDatabase(db, sessionId);
    const quizRows = await getSessionQuizResultsOnDatabase(db, sessionId);

    if (quizRows.length === 0 || quizRows.some((row) => row.answered_at === null || row.is_correct === null)) {
      throw new Error('Quiz tamamlanmadan oturum kapatılamaz.');
    }

    const wordMap = new Map<number, { baseRating: Rating; durationMs: number }>();

    for (const row of studyRows) {
      const current = wordMap.get(row.word_id) ?? { baseRating: 'again' as Rating, durationMs: 0 };
      current.durationMs += row.duration_ms ?? 0;

      if (row.result_rating && row.result_rating !== 'again') {
        current.baseRating = row.result_rating;
      }

      wordMap.set(row.word_id, current);
    }

    for (const row of quizRows) {
      const current = wordMap.get(row.word_id) ?? { baseRating: 'again' as Rating, durationMs: 0 };
      const finalRating: Rating = row.is_correct ? current.baseRating : 'again';
      const totalDurationMs = current.durationMs + (row.duration_ms ?? 0);
      const ratingResult = await applyWordRatingOnDatabase(db, row.word_id, finalRating);

      await recordDailyStatsOnDatabase(db, {
        isNew: ratingResult.wasNew,
        rating: finalRating,
        durationMs: totalDurationMs,
      });
    }

    await completeSessionOnDatabase(db, sessionId);
    await db.execAsync('COMMIT');
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
