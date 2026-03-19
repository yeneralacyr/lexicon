import { getDatabase } from '@/db';
import { getAppOverviewQuery, getStudySettings, updateStudySettingsQuery } from '@/db/queries';
import type { AppOverview, StudySettings } from '@/types/db';
import type { Rating, WordProgressRecord, WordStatus } from '@/types/progress';
import type { WordCandidate } from '@/types/word';
import { nowIso, plusDaysIso, todayIso } from '@/utils/dates';

export async function getAppOverviewRepository(): Promise<AppOverview> {
  const db = await getDatabase();
  return getAppOverviewQuery(db);
}

export async function getStudySettingsRepository(): Promise<StudySettings> {
  const db = await getDatabase();
  return getStudySettings(db);
}

export async function updateStudySettingsRepository(updates: Partial<StudySettings>): Promise<StudySettings> {
  const db = await getDatabase();
  return updateStudySettingsQuery(db, updates);
}

export async function getDueWordCandidatesRepository(limit: number): Promise<WordCandidate[]> {
  const db = await getDatabase();

  return db.getAllAsync<WordCandidate>(
    `
      SELECT w.id, w.english, w.turkish, w.sentence1 as sentence
      FROM word_progress p
      INNER JOIN words w ON w.id = p.word_id
      WHERE p.next_due_at IS NOT NULL
        AND p.next_due_at <= ?
        AND p.is_suspended = 0
      ORDER BY p.next_due_at ASC
      LIMIT ?
    `,
    todayIso(),
    limit
  );
}

async function getWordProgressRow(db: Awaited<ReturnType<typeof getDatabase>>, wordId: number) {
  return db.getFirstAsync<{
    word_id: number;
    status: WordStatus;
    mastery_level: number;
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    lapses: number;
    seen_count: number;
    correct_count: number;
    wrong_count: number;
    last_seen_at: string | null;
    last_reviewed_at: string | null;
    next_due_at: string | null;
    is_favorite: number;
    is_suspended: number;
  }>(
    `
      SELECT *
      FROM word_progress
      WHERE word_id = ?
    `,
    wordId
  );
}

function pickIntervalDays(rating: Rating, repetitions: number) {
  const goodSteps = [1, 3, 7, 14, 30, 60];
  const easySteps = [3, 7, 14, 30, 60, 90];

  if (rating === 'again') {
    return 0;
  }
  if (rating === 'hard') {
    return 1;
  }
  if (rating === 'easy') {
    return easySteps[Math.min(repetitions, easySteps.length - 1)];
  }

  return goodSteps[Math.min(repetitions, goodSteps.length - 1)];
}

function nextStatus(currentStatus: WordStatus | undefined, rating: Rating, repetitions: number): WordStatus {
  if (rating === 'again') {
    return 'learning';
  }
  if (rating === 'hard') {
    return currentStatus === 'mastered' ? 'review' : 'learning';
  }
  if (rating === 'easy' && repetitions >= 4) {
    return 'mastered';
  }
  if (rating === 'good' || rating === 'easy') {
    return 'review';
  }

  return currentStatus ?? 'new';
}

export async function applyWordRatingRepository(wordId: number, rating: Rating): Promise<WordProgressRecord> {
  const db = await getDatabase();
  const current = await getWordProgressRow(db, wordId);
  const now = nowIso();
  const repetitions = rating === 'again' ? 0 : (current?.repetitions ?? 0) + 1;
  const intervalDays = pickIntervalDays(rating, repetitions);
  const status = nextStatus(current?.status, rating, repetitions);
  const correctIncrement = rating === 'again' ? 0 : 1;
  const wrongIncrement = rating === 'again' ? 1 : 0;
  const masteryLevel =
    rating === 'easy'
      ? (current?.mastery_level ?? 0) + 1
      : rating === 'again'
        ? Math.max(0, (current?.mastery_level ?? 0) - 1)
        : current?.mastery_level ?? 0;
  const nextDueAt = plusDaysIso(intervalDays);

  await db.runAsync(
    `
      INSERT INTO word_progress (
        word_id,
        status,
        mastery_level,
        ease_factor,
        interval_days,
        repetitions,
        lapses,
        seen_count,
        correct_count,
        wrong_count,
        last_seen_at,
        last_reviewed_at,
        next_due_at,
        is_favorite,
        is_suspended,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        status = excluded.status,
        mastery_level = excluded.mastery_level,
        ease_factor = excluded.ease_factor,
        interval_days = excluded.interval_days,
        repetitions = excluded.repetitions,
        lapses = excluded.lapses,
        seen_count = excluded.seen_count,
        correct_count = excluded.correct_count,
        wrong_count = excluded.wrong_count,
        last_seen_at = excluded.last_seen_at,
        last_reviewed_at = excluded.last_reviewed_at,
        next_due_at = excluded.next_due_at,
        is_favorite = excluded.is_favorite,
        is_suspended = excluded.is_suspended,
        updated_at = excluded.updated_at
    `,
    wordId,
    status,
    masteryLevel,
    current?.ease_factor ?? 2.5,
    intervalDays,
    repetitions,
    (current?.lapses ?? 0) + wrongIncrement,
    (current?.seen_count ?? 0) + 1,
    (current?.correct_count ?? 0) + correctIncrement,
    (current?.wrong_count ?? 0) + wrongIncrement,
    now,
    now,
    nextDueAt,
    current?.is_favorite ?? 0,
    current?.is_suspended ?? 0,
    now
  );

  return {
    wordId,
    status,
    masteryLevel,
    easeFactor: current?.ease_factor ?? 2.5,
    intervalDays,
    repetitions,
    lapses: (current?.lapses ?? 0) + wrongIncrement,
    seenCount: (current?.seen_count ?? 0) + 1,
    correctCount: (current?.correct_count ?? 0) + correctIncrement,
    wrongCount: (current?.wrong_count ?? 0) + wrongIncrement,
    lastSeenAt: now,
    lastReviewedAt: now,
    nextDueAt,
    isFavorite: Boolean(current?.is_favorite ?? 0),
    isSuspended: Boolean(current?.is_suspended ?? 0),
  };
}

export async function toggleFavoriteRepository(wordId: number) {
  const db = await getDatabase();
  const current = await getWordProgressRow(db, wordId);
  const nextFavorite = current?.is_favorite ? 0 : 1;

  await db.runAsync(
    `
      INSERT INTO word_progress (
        word_id,
        status,
        mastery_level,
        ease_factor,
        interval_days,
        repetitions,
        lapses,
        seen_count,
        correct_count,
        wrong_count,
        is_favorite,
        is_suspended,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        is_favorite = excluded.is_favorite,
        updated_at = excluded.updated_at
    `,
    wordId,
    current?.status ?? 'new',
    current?.mastery_level ?? 0,
    current?.ease_factor ?? 2.5,
    current?.interval_days ?? 0,
    current?.repetitions ?? 0,
    current?.lapses ?? 0,
    current?.seen_count ?? 0,
    current?.correct_count ?? 0,
    current?.wrong_count ?? 0,
    nextFavorite,
    current?.is_suspended ?? 0,
    nowIso()
  );

  return Boolean(nextFavorite);
}

export async function toggleSuspendedRepository(wordId: number) {
  const db = await getDatabase();
  const current = await getWordProgressRow(db, wordId);
  const nextSuspended = current?.is_suspended ? 0 : 1;

  await db.runAsync(
    `
      INSERT INTO word_progress (
        word_id,
        status,
        mastery_level,
        ease_factor,
        interval_days,
        repetitions,
        lapses,
        seen_count,
        correct_count,
        wrong_count,
        is_favorite,
        is_suspended,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        is_suspended = excluded.is_suspended,
        updated_at = excluded.updated_at
    `,
    wordId,
    current?.status ?? 'new',
    current?.mastery_level ?? 0,
    current?.ease_factor ?? 2.5,
    current?.interval_days ?? 0,
    current?.repetitions ?? 0,
    current?.lapses ?? 0,
    current?.seen_count ?? 0,
    current?.correct_count ?? 0,
    current?.wrong_count ?? 0,
    current?.is_favorite ?? 0,
    nextSuspended,
    nowIso()
  );

  return Boolean(nextSuspended);
}

export async function pushWordToReviewRepository(wordId: number) {
  const db = await getDatabase();
  const current = await getWordProgressRow(db, wordId);
  const now = nowIso();

  await db.runAsync(
    `
      INSERT INTO word_progress (
        word_id,
        status,
        mastery_level,
        ease_factor,
        interval_days,
        repetitions,
        lapses,
        seen_count,
        correct_count,
        wrong_count,
        next_due_at,
        is_favorite,
        is_suspended,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        status = excluded.status,
        next_due_at = excluded.next_due_at,
        is_suspended = excluded.is_suspended,
        updated_at = excluded.updated_at
    `,
    wordId,
    'review',
    current?.mastery_level ?? 0,
    current?.ease_factor ?? 2.5,
    current?.interval_days ?? 0,
    current?.repetitions ?? 0,
    current?.lapses ?? 0,
    current?.seen_count ?? 0,
    current?.correct_count ?? 0,
    current?.wrong_count ?? 0,
    todayIso(),
    current?.is_favorite ?? 0,
    0,
    now
  );
}
