import dayjs from 'dayjs';

import { getDatabase } from '@/db';
import type { Rating } from '@/types/progress';
import type { ActiveSession, PromptType, SessionDetail, SessionSummary } from '@/types/session';
import { nowIso, plusDaysIso, todayIso } from '@/utils/dates';

type CreateSessionInput = {
  id: string;
  sessionType: string;
  totalItems: number;
  newItems: number;
  reviewItems: number;
};

type CreateSessionItemInput = {
  sessionId: string;
  wordId: number;
  orderIndex: number;
  promptType: PromptType;
  selectedSentenceIndex: number | null;
};

export async function createSessionOnDatabase(
  db: Awaited<ReturnType<typeof getDatabase>>,
  input: CreateSessionInput
) {
  await db.runAsync(
    `
      INSERT INTO sessions (
        id,
        session_type,
        started_at,
        total_items,
        new_items,
        review_items,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `,
    input.id,
    input.sessionType,
    nowIso(),
    input.totalItems,
    input.newItems,
    input.reviewItems
  );
}

export async function createSessionRepository(input: CreateSessionInput) {
  const db = await getDatabase();
  await createSessionOnDatabase(db, input);
}

export async function createSessionItemsOnDatabase(
  db: Awaited<ReturnType<typeof getDatabase>>,
  items: CreateSessionItemInput[]
) {
  for (const item of items) {
    await db.runAsync(
      `
        INSERT INTO session_items (
          session_id,
          word_id,
          order_index,
          prompt_type,
          selected_sentence_index
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      item.sessionId,
      item.wordId,
      item.orderIndex,
      item.promptType,
      item.selectedSentenceIndex
    );
  }
}

export async function createSessionItemsRepository(items: CreateSessionItemInput[]) {
  const db = await getDatabase();
  await createSessionItemsOnDatabase(db, items);
}

export async function getActiveSessionRepository(): Promise<ActiveSession | null> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<{
    id: string;
    session_type: string;
    started_at: string;
    total_items: number;
    completed_items: number;
    new_items: number;
    review_items: number;
  }>(
    `
      SELECT
        id,
        session_type,
        started_at,
        total_items,
        completed_items,
        new_items,
        review_items
      FROM sessions
      WHERE status = 'active'
        AND completed_items < total_items
      ORDER BY started_at DESC
      LIMIT 1
    `
  );

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    sessionType: session.session_type,
    startedAt: session.started_at,
    totalItems: session.total_items,
    completedItems: session.completed_items,
    newItems: session.new_items,
    reviewItems: session.review_items,
  };
}

export async function resumeActiveSessionRepository() {
  const activeSession = await getActiveSessionRepository();
  if (!activeSession) {
    return null;
  }

  return getSessionDetailRepository(activeSession.id);
}

export async function getSessionDetailRepository(sessionId: string): Promise<SessionDetail | null> {
  const db = await getDatabase();

  const session = await db.getFirstAsync<{
    id: string;
    status: string;
    session_type: string;
    started_at: string;
    ended_at: string | null;
    total_items: number;
    completed_items: number;
    new_items: number;
    review_items: number;
  }>(
    `
      SELECT
        id,
        status,
        session_type,
        started_at,
        ended_at,
        total_items,
        completed_items,
        new_items,
        review_items
      FROM sessions
      WHERE id = ?
    `,
    sessionId
  );

  if (!session) {
    return null;
  }

  const items = await db.getAllAsync<{
    id: number;
    word_id: number;
    english: string;
    turkish: string;
    sentence: string | null;
    selected_sentence_index: number | null;
    order_index: number;
    prompt_type: PromptType;
    result_rating: Rating | null;
    duration_ms: number | null;
  }>(
    `
      SELECT
        si.id,
        si.word_id,
        w.english,
        w.turkish,
        CASE COALESCE(si.selected_sentence_index, 1)
          WHEN 2 THEN w.sentence2
          WHEN 3 THEN w.sentence3
          WHEN 4 THEN w.sentence4
          WHEN 5 THEN w.sentence5
          ELSE w.sentence1
        END as sentence,
        si.selected_sentence_index,
        si.order_index,
        si.prompt_type,
        si.result_rating,
        si.duration_ms
      FROM session_items si
      INNER JOIN words w ON w.id = si.word_id
      WHERE si.session_id = ?
      ORDER BY si.order_index ASC
    `,
    sessionId
  );

  return {
    id: session.id,
    status: session.status,
    sessionType: session.session_type,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    totalItems: session.total_items,
    completedItems: session.completed_items,
    newItems: session.new_items,
    reviewItems: session.review_items,
    items: items.map((item) => ({
      id: item.id,
      wordId: item.word_id,
      english: item.english,
      turkish: item.turkish,
      sentence: item.sentence,
      selectedSentenceIndex: item.selected_sentence_index ?? null,
      orderIndex: item.order_index,
      promptType: item.prompt_type,
      resultRating: item.result_rating,
      durationMs: item.duration_ms ?? null,
    })),
  };
}

export async function getSessionItemContextOnDatabase(
  db: Awaited<ReturnType<typeof getDatabase>>,
  sessionItemId: number
) {
  return db.getFirstAsync<{
    id: number;
    session_id: string;
    word_id: number;
    result_rating: Rating | null;
    selected_sentence_index: number | null;
  }>(
    `
      SELECT id, session_id, word_id, result_rating, selected_sentence_index
      FROM session_items
      WHERE id = ?
    `,
    sessionItemId
  );
}

export async function markSessionItemRatedOnDatabase(
  db: Awaited<ReturnType<typeof getDatabase>>,
  sessionItemId: number,
  rating: Rating,
  durationMs: number
) {
  await db.runAsync(
    `
      UPDATE session_items
      SET result_rating = ?, answered_at = ?, duration_ms = ?
      WHERE id = ?
    `,
    rating,
    nowIso(),
    durationMs,
    sessionItemId
  );
}

export async function markSessionItemRatedRepository(
  sessionItemId: number,
  rating: Rating,
  durationMs = 0
) {
  const db = await getDatabase();
  await markSessionItemRatedOnDatabase(db, sessionItemId, rating, durationMs);
}

export async function setSessionCompletedItemsOnDatabase(
  db: Awaited<ReturnType<typeof getDatabase>>,
  sessionId: string,
  completedItems: number
) {
  await db.runAsync(
    `
      UPDATE sessions
      SET completed_items = ?
      WHERE id = ?
    `,
    completedItems,
    sessionId
  );
}

export async function setSessionCompletedItemsRepository(sessionId: string, completedItems: number) {
  const db = await getDatabase();
  await setSessionCompletedItemsOnDatabase(db, sessionId, completedItems);
}

export async function completeSessionOnDatabase(db: Awaited<ReturnType<typeof getDatabase>>, sessionId: string) {
  const session = await db.getFirstAsync<{ started_at: string; total_items: number }>(
    `
      SELECT started_at, total_items
      FROM sessions
      WHERE id = ?
    `,
    sessionId
  );
  const endedAt = nowIso();
  const durationSeconds = session?.started_at
    ? Math.max(0, dayjs(endedAt).diff(dayjs(session.started_at), 'second'))
    : null;

  await db.runAsync(
    `
      UPDATE sessions
      SET status = 'completed',
          completed_items = ?,
          ended_at = ?,
          duration_seconds = ?
      WHERE id = ?
    `,
    session?.total_items ?? 0,
    endedAt,
    durationSeconds,
    sessionId
  );
}

export async function completeSessionRepository(sessionId: string) {
  const db = await getDatabase();
  await completeSessionOnDatabase(db, sessionId);
}

export async function getSessionSummaryRepository(sessionId: string): Promise<SessionSummary | null> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<{
    id: string;
    status: string;
    total_items: number;
    completed_items: number;
    new_items: number;
    review_items: number;
    duration_seconds: number | null;
  }>(
    `
      SELECT id, status, total_items, completed_items, new_items, review_items, duration_seconds
      FROM sessions
      WHERE id = ?
    `,
    sessionId
  );

  if (!session) {
    return null;
  }

  const tomorrowCount = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM session_items si
      INNER JOIN word_progress wp ON wp.word_id = si.word_id
      WHERE si.session_id = ?
        AND wp.next_due_at > ?
        AND wp.next_due_at <= ?
    `,
    sessionId,
    todayIso(),
    plusDaysIso(1)
  );

  return {
    id: session.id,
    status: session.status,
    totalItems: session.total_items,
    completedItems: session.completed_items,
    newItems: session.new_items,
    reviewItems: session.review_items,
    tomorrowCount: tomorrowCount?.count ?? 0,
    durationSeconds: session.duration_seconds,
  };
}
