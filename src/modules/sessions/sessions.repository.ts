import { getDatabase } from '@/db';
import type { Rating } from '@/types/progress';
import type { PromptType, SessionDetail, SessionSummary } from '@/types/session';
import { nowIso } from '@/utils/dates';

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
};

export async function createSessionRepository(input: CreateSessionInput) {
  const db = await getDatabase();

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

export async function createSessionItemsRepository(items: CreateSessionItemInput[]) {
  const db = await getDatabase();

  for (const item of items) {
    await db.runAsync(
      `
        INSERT INTO session_items (
          session_id,
          word_id,
          order_index,
          prompt_type
        )
        VALUES (?, ?, ?, ?)
      `,
      item.sessionId,
      item.wordId,
      item.orderIndex,
      item.promptType
    );
  }
}

export async function getSessionDetailRepository(sessionId: string): Promise<SessionDetail | null> {
  const db = await getDatabase();

  const session = await db.getFirstAsync<{
    id: string;
    status: string;
    total_items: number;
    completed_items: number;
    new_items: number;
    review_items: number;
  }>(
    `
      SELECT id, status, total_items, completed_items, new_items, review_items
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
    order_index: number;
    prompt_type: PromptType;
    result_rating: Rating | null;
  }>(
    `
      SELECT
        si.id,
        si.word_id,
        w.english,
        w.turkish,
        w.sentence1 as sentence,
        si.order_index,
        si.prompt_type,
        si.result_rating
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
      orderIndex: item.order_index,
      promptType: item.prompt_type,
      resultRating: item.result_rating,
    })),
  };
}

export async function markSessionItemRatedRepository(sessionItemId: number, rating: Rating) {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE session_items
      SET result_rating = ?, answered_at = ?
      WHERE id = ?
    `,
    rating,
    nowIso(),
    sessionItemId
  );
}

export async function setSessionCompletedItemsRepository(sessionId: string, completedItems: number) {
  const db = await getDatabase();

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

export async function completeSessionRepository(sessionId: string) {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE sessions
      SET status = 'completed',
          completed_items = total_items,
          ended_at = ?
      WHERE id = ?
    `,
    nowIso(),
    sessionId
  );
}

export async function getSessionSummaryRepository(sessionId: string): Promise<SessionSummary | null> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<{
    id: string;
    total_items: number;
    completed_items: number;
    new_items: number;
    review_items: number;
  }>(
    `
      SELECT id, total_items, completed_items, new_items, review_items
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
        AND wp.next_due_at > date('now')
        AND wp.next_due_at <= datetime('now', '+1 day')
    `,
    sessionId
  );

  return {
    id: session.id,
    totalItems: session.total_items,
    completedItems: session.completed_items,
    newItems: session.new_items,
    reviewItems: session.review_items,
    tomorrowCount: tomorrowCount?.count ?? 0,
  };
}
