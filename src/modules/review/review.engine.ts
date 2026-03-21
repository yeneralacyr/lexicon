import { getDatabase } from '@/db';
import { getDashboardSnapshotQuery } from '@/db/queries';
import {
  applyWordRatingOnDatabase,
  consumeDailyNewUnlockOnDatabase,
  getDueWordCandidatesRepository,
  getTodayDailyUnlocksOnDatabase,
  markWordMasteredOnDatabase,
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
  getActiveSessionByScopeOnDatabase,
  getActiveLibraryReviewSessionRepository,
  getActiveStudySessionRepository,
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
import { getLibraryReviewCandidatesRepository, getNewWordCandidatesRepository } from '@/modules/words/words.repository';
import type { Rating } from '@/types/progress';
import type {
  LibraryReviewDecision,
  SessionDecision,
  SessionQuizDetail,
  SessionSummary,
} from '@/types/session';
import { normalizeSearchText } from '@/utils/normalize';
import { createSessionId } from '@/utils/random';

export type SessionMode = 'daily' | 'review_only' | 'new_only';
const MAX_LIBRARY_REVIEW_ITEMS = 20;
const quizDistractorCache = new Map<string, QuizDistractor[]>();

type SessionEntry = {
  word: Awaited<ReturnType<typeof getNewWordCandidatesRepository>>[number];
  source: 'review' | 'new';
  sourceIndex: number;
};

export async function getDashboardSnapshot(): Promise<ReviewDashboardSnapshot> {
  const db = await getDatabase();
  return getDashboardSnapshotQuery(db);
}

export function pickSelectedSentenceIndex(sentences: string[], orderIndex: number) {
  if (sentences.length === 0) {
    return null;
  }

  return (orderIndex % sentences.length) + 1;
}

function shuffleList<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }

  return next;
}

export function mixSessionEntries(reviewItems: SessionEntry[], newItems: SessionEntry[]) {
  const mixed: SessionEntry[] = [];
  const reviewQueue = [...reviewItems];
  const newQueue = [...newItems];
  let preferReview = reviewQueue.length >= newQueue.length;

  while (reviewQueue.length > 0 || newQueue.length > 0) {
    if (preferReview && reviewQueue.length > 0) {
      mixed.push(reviewQueue.shift() as SessionEntry);
    } else if (!preferReview && newQueue.length > 0) {
      mixed.push(newQueue.shift() as SessionEntry);
    } else if (reviewQueue.length > 0) {
      mixed.push(reviewQueue.shift() as SessionEntry);
    } else if (newQueue.length > 0) {
      mixed.push(newQueue.shift() as SessionEntry);
    }

    preferReview = !preferReview;
  }

  return mixed;
}

export async function buildDailySession(mode: SessionMode = 'daily'): Promise<BuildDailySessionResult | null> {
  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE');

  try {
    const activeSession = await getActiveSessionByScopeOnDatabase(db, 'study');

    if (activeSession) {
      await db.execAsync('COMMIT');
      return {
        id: activeSession.id,
        totalItems: activeSession.totalItems,
        resumed: true,
        phase: activeSession.phase,
        sessionType: activeSession.sessionType,
      };
    }

    const settings = await getStudySettingsRepository();
    const unlocks = await getTodayDailyUnlocksOnDatabase(db);
    const remainingFreeNew = Math.max(0, settings.dailyNewLimit - unlocks.freeNewUnlockedCount);
    const availableRewardedNew = Math.max(0, unlocks.rewardedNewUnlockedCount);
    const maxAvailableNewWords = remainingFreeNew + availableRewardedNew;
    const dueWords = mode === 'new_only' ? [] : await getDueWordCandidatesRepository(settings.dailyReviewLimit);
    const newWords =
      mode === 'review_only' || maxAvailableNewWords === 0
        ? []
        : await getNewWordCandidatesRepository(maxAvailableNewWords);
    const shuffledDueWords = shuffleList(dueWords);
    const shuffledNewWords = shuffleList(newWords);
    const selectedWords = mixSessionEntries(
      shuffledDueWords.map((word, index) => ({
        word,
        source: 'review' as const,
        sourceIndex: index,
      })),
      shuffledNewWords.map((word, index) => ({
        word,
        source: 'new' as const,
        sourceIndex: index,
      }))
    );

    if (selectedWords.length === 0) {
      await db.execAsync('COMMIT');
      return null;
    }

    const sessionId = createSessionId();

    await createSessionOnDatabase(db, {
      id: sessionId,
      sessionType: mode,
      totalItems: selectedWords.length,
      newItems: shuffledNewWords.length,
      reviewItems: shuffledDueWords.length,
    });

    await createSessionItemsOnDatabase(
      db,
      selectedWords.map((entry, index) => ({
        sessionId,
        wordId: entry.word.id,
        orderIndex: index,
        sourceType: entry.source,
        promptType: pickMeaningfulPromptType({
          source: entry.source,
          sourceIndex: entry.sourceIndex,
          hasSentence: entry.word.sentences.length > 0,
        }),
        selectedSentenceIndex: pickSelectedSentenceIndex(entry.word.sentences, index),
      }))
    );

    await db.execAsync('COMMIT');
    return {
      id: sessionId,
      totalItems: selectedWords.length,
      resumed: false,
      phase: 'study',
      sessionType: mode,
    };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    const activeSession = await getActiveStudySessionRepository();

    if (activeSession) {
      return {
        id: activeSession.id,
        totalItems: activeSession.totalItems,
        resumed: true,
        phase: activeSession.phase,
        sessionType: activeSession.sessionType,
      };
    }

    throw error;
  }
}

export async function buildLibraryReviewSession(): Promise<BuildDailySessionResult | null> {
  const activeSession = await getActiveLibraryReviewSessionRepository();

  if (activeSession) {
    return {
      id: activeSession.id,
      totalItems: activeSession.totalItems,
      resumed: true,
      phase: activeSession.phase,
      sessionType: activeSession.sessionType,
    };
  }

  const words = await getLibraryReviewCandidatesRepository(MAX_LIBRARY_REVIEW_ITEMS);

  if (words.length === 0) {
    return null;
  }

  const db = await getDatabase();
  const sessionId = createSessionId();

  await db.execAsync('BEGIN IMMEDIATE');

  try {
    await createSessionOnDatabase(db, {
      id: sessionId,
      sessionType: 'library_review',
      totalItems: words.length,
      newItems: 0,
      reviewItems: words.length,
    });

    await createSessionItemsOnDatabase(
      db,
      words.map((word, index) => ({
        sessionId,
        wordId: word.id,
        orderIndex: index,
        sourceType: 'review',
        promptType: 'recall',
        selectedSentenceIndex: null,
      }))
    );

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  return {
    id: sessionId,
    totalItems: words.length,
    resumed: false,
    phase: 'study',
    sessionType: 'library_review',
  };
}

export function mapSessionDecisionToRating(decision: SessionDecision): Rating {
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

    const alreadyCountedAsNew = await db.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM session_items
        WHERE session_id = ?
          AND word_id = ?
          AND source_type = 'new'
          AND result_rating IS NOT NULL
      `,
      params.sessionId,
      params.wordId
    );

    if ((alreadyCountedAsNew?.count ?? 0) === 0) {
      await consumeDailyNewUnlockOnDatabase(db, {
        sessionId: params.sessionId,
        sourceType: sessionItem.source_type,
      });
    }

    await markSessionItemRatedOnDatabase(db, params.sessionItemId, rating, params.durationMs);

    const replay =
      params.decision === 'show_again'
        ? await queueSessionReplayOnDatabase(db, {
        sessionId: params.sessionId,
        wordId: params.wordId,
        afterOrderIndex: params.currentOrderIndex,
        sourceType: sessionItem.source_type,
        selectedSentenceIndex: params.selectedSentenceIndex,
          })
        : null;

    const nextCompletedItems = sessionProgress.completed_items + 1;
    const nextTotalItems = sessionProgress.total_items + (replay ? 1 : 0);

    await setSessionCompletedItemsOnDatabase(db, params.sessionId, nextCompletedItems);

    await db.execAsync('COMMIT');
    return {
      rating,
      completedItems: nextCompletedItems,
      totalItems: nextTotalItems,
      replay,
    };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

function mapLibraryReviewDecisionToRating(decision: LibraryReviewDecision): Rating {
  return decision === 'mastered' ? 'easy' : 'again';
}

export async function applyLibraryReviewDecision(params: {
  sessionId: string;
  sessionItemId: number;
  wordId: number;
  decision: LibraryReviewDecision;
  durationMs: number;
}) {
  const db = await getDatabase();

  await db.execAsync('BEGIN');

  try {
    const sessionItem = await getSessionItemContextOnDatabase(db, params.sessionItemId);

    if (!sessionItem || sessionItem.session_id !== params.sessionId || sessionItem.word_id !== params.wordId) {
      throw new Error('Session item not found for library review.');
    }

    if (sessionItem.result_rating) {
      await db.execAsync('ROLLBACK');
      return null;
    }

    const rating = mapLibraryReviewDecisionToRating(params.decision);
    const sessionProgress = await getSessionCompletedItemsOnDatabase(db, params.sessionId);

    if (!sessionProgress) {
      throw new Error('Library review session not found.');
    }

    await markSessionItemRatedOnDatabase(db, params.sessionItemId, rating, params.durationMs);

    if (params.decision === 'mastered') {
      await markWordMasteredOnDatabase(db, params.wordId, 30);
    }

    await recordDailyStatsOnDatabase(db, {
      isNew: false,
      rating,
      durationMs: params.durationMs,
    });

    const nextCompletedItems = sessionProgress.completed_items + 1;
    await setSessionCompletedItemsOnDatabase(db, params.sessionId, nextCompletedItems);

    const completed = nextCompletedItems >= sessionProgress.total_items;

    if (completed) {
      await completeSessionOnDatabase(db, params.sessionId);
    }

    await db.execAsync('COMMIT');
    return { completed, rating };
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
  const quiz = await getSessionQuizDetailRepository(sessionId);

  if (!quiz) {
    return null;
  }

  let distractorPool = quizDistractorCache.get(sessionId);

  if (!distractorPool) {
    distractorPool = await getQuizDistractorPool(
      quiz.items.map((item) => ({
        wordId: item.wordId,
        turkish: item.turkish,
        normalizedTurkish: item.normalizedTurkish,
        orderIndex: item.orderIndex,
      }))
    );
    quizDistractorCache.set(sessionId, distractorPool);
  }

  return {
    ...quiz,
    items: quiz.items.map((item) => ({
      ...item,
      options: buildQuizOptions(item, quiz.items, distractorPool, sessionId),
    })),
  };
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

    const saved = await saveSessionQuizAnswerOnDatabase(db, {
      sessionId: params.sessionId,
      wordId: params.wordId,
      userAnswer: params.answer,
      normalizedAnswer,
      isCorrect,
      durationMs: params.durationMs,
    });

    if (!saved) {
      await db.execAsync('ROLLBACK');
      return null;
    }

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

      if (row.result_rating) {
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
    quizDistractorCache.delete(sessionId);
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

type QuizDistractor = {
  wordId: number;
  turkish: string;
  normalizedTurkish: string;
  orderIndex: number;
};

async function getQuizDistractorPool(sessionItems: QuizDistractor[]): Promise<QuizDistractor[]> {
  const db = await getDatabase();
  const sessionWordIds = sessionItems.map((item) => item.wordId);
  const sessionMeanings = new Set(sessionItems.map((item) => item.normalizedTurkish));
  const placeholders =
    sessionWordIds.length > 0 ? sessionWordIds.map(() => '?').join(', ') : null;
  const baseRows = await db.getAllAsync<{
    id: number;
    turkish: string;
    normalized_turkish: string;
  }>(
    `
      SELECT id, turkish, normalized_turkish
      FROM words
      ${placeholders ? `WHERE id NOT IN (${placeholders})` : ''}
      ORDER BY RANDOM()
      LIMIT 96
    `,
    ...(sessionWordIds as (string | number)[])
  );

  const rows = baseRows.filter((row) => !sessionMeanings.has(row.normalized_turkish));

  return rows.map((row, index) => ({
    wordId: row.id,
    turkish: row.turkish,
    normalizedTurkish: row.normalized_turkish,
    orderIndex: sessionItems.length + index,
  }));
}

function buildQuizOptions(
  currentItem: SessionQuizDetail['items'][number],
  allItems: SessionQuizDetail['items'],
  distractorPool: QuizDistractor[],
  sessionId: string
) {
  const candidateMap = new Map<string, QuizDistractor>();

  for (const item of allItems) {
    if (item.wordId === currentItem.wordId || item.normalizedTurkish === currentItem.normalizedTurkish) {
      continue;
    }

    const existing = candidateMap.get(item.normalizedTurkish);

    if (!existing) {
      candidateMap.set(item.normalizedTurkish, {
        wordId: item.wordId,
        turkish: item.turkish,
        normalizedTurkish: item.normalizedTurkish,
        orderIndex: item.orderIndex,
      });
      continue;
    }

    if (Math.abs(item.orderIndex - currentItem.orderIndex) < Math.abs(existing.orderIndex - currentItem.orderIndex)) {
      candidateMap.set(item.normalizedTurkish, {
        wordId: item.wordId,
        turkish: item.turkish,
        normalizedTurkish: item.normalizedTurkish,
        orderIndex: item.orderIndex,
      });
    }
  }

  const sessionDistractors = [...candidateMap.values()].sort((left, right) => {
    const leftDistance = Math.abs(left.orderIndex - currentItem.orderIndex);
    const rightDistance = Math.abs(right.orderIndex - currentItem.orderIndex);
    return leftDistance - rightDistance || left.orderIndex - right.orderIndex;
  });

  const distractors: QuizDistractor[] = [];
  const usedNormalized = new Set<string>([currentItem.normalizedTurkish]);

  for (const candidate of sessionDistractors) {
    if (distractors.length >= 3) {
      break;
    }

    if (usedNormalized.has(candidate.normalizedTurkish)) {
      continue;
    }

    distractors.push(candidate);
    usedNormalized.add(candidate.normalizedTurkish);
  }

  for (const candidate of distractorPool) {
    if (distractors.length >= 3) {
      break;
    }

    if (usedNormalized.has(candidate.normalizedTurkish)) {
      continue;
    }

    distractors.push(candidate);
    usedNormalized.add(candidate.normalizedTurkish);
  }

  return stableShuffle(
    [currentItem.turkish, ...distractors.map((candidate) => candidate.turkish)],
    `${sessionId}:${currentItem.wordId}`
  );
}

export function stableShuffle(options: string[], seed: string) {
  return [...options]
    .map((option, index) => ({
      option,
      rank: seededRank(`${seed}:${option}:${index}`),
    }))
    .sort((left, right) => left.rank - right.rank || left.option.localeCompare(right.option, 'tr'))
    .map((entry) => entry.option);
}

export function seededRank(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export async function finalizeSession(sessionId: string) {
  await completeSessionRepository(sessionId);
}

export async function getSessionSummarySnapshot(sessionId: string): Promise<SessionSummary | null> {
  return getSessionSummaryRepository(sessionId);
}
