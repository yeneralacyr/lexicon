import { getDatabase } from '@/db';
import type {
  LibraryPage,
  LibraryQuery,
  WordCandidate,
  WordDetail,
  WordListItem,
} from '@/types/word';
import { normalizeSearchText } from '@/utils/normalize';

function sentencesFromRow(row: {
  sentence1: string | null;
  sentence2: string | null;
  sentence3: string | null;
  sentence4: string | null;
  sentence5: string | null;
}) {
  return [row.sentence1, row.sentence2, row.sentence3, row.sentence4, row.sentence5].filter(
    (sentence): sentence is string => Boolean(sentence)
  );
}

function mapWordListItem(row: {
  id: number;
  english: string;
  turkish: string;
  status: WordListItem['status'];
  is_favorite: number | null;
}): WordListItem {
  return {
    id: row.id,
    english: row.english,
    turkish: row.turkish,
    status: row.status ?? null,
    isFavorite: Boolean(row.is_favorite ?? 0),
  };
}

async function getCandidatesByStatusOnDatabase(
  db: Awaited<ReturnType<typeof getDatabase>>,
  status: 'review' | 'learning',
  limit: number,
  excludeWordIds: number[] = []
) {
  if (limit <= 0) {
    return [];
  }

  const placeholders = excludeWordIds.length > 0 ? excludeWordIds.map(() => '?').join(', ') : null;

  return db.getAllAsync<{
    id: number;
    english: string;
    turkish: string;
    sentence1: string | null;
    sentence2: string | null;
    sentence3: string | null;
    sentence4: string | null;
    sentence5: string | null;
  }>(
    `
      SELECT
        w.id,
        w.english,
        w.turkish,
        w.sentence1,
        w.sentence2,
        w.sentence3,
        w.sentence4,
        w.sentence5
      FROM word_progress p
      INNER JOIN words w ON w.id = p.word_id
      WHERE p.status = ?
        AND p.is_suspended = 0
        ${placeholders ? `AND w.id NOT IN (${placeholders})` : ''}
      ORDER BY RANDOM()
      LIMIT ?
    `,
    status,
    ...excludeWordIds,
    limit
  );
}

function buildLibraryFilterQuery(filter: LibraryQuery['filter']) {
  switch (filter) {
    case 'favorites':
      return {
        whereClause:
          "WHERE COALESCE(p.is_favorite, 0) = 1 AND p.word_id IS NOT NULL AND p.status IN ('learning', 'review', 'mastered')",
        params: [] as (string | number)[],
      };
    case 'learned':
      return {
        whereClause: "WHERE p.word_id IS NOT NULL AND p.status IN ('learning', 'review', 'mastered')",
        params: [] as (string | number)[],
      };
    case 'learning':
      return { whereClause: "WHERE p.status = 'learning'", params: [] as (string | number)[] };
    case 'review':
      return { whereClause: "WHERE p.status = 'review'", params: [] as (string | number)[] };
    case 'mastered':
      return { whereClause: "WHERE p.status = 'mastered'", params: [] as (string | number)[] };
    default:
      return {
        whereClause: "WHERE p.word_id IS NOT NULL AND p.status IN ('learning', 'review', 'mastered')",
        params: [] as (string | number)[],
      };
  }
}

export async function getLibraryWordsRepository(query: LibraryQuery): Promise<LibraryPage> {
  const db = await getDatabase();
  const filterQuery = buildLibraryFilterQuery(query.filter);
  const items = await db.getAllAsync<{
    id: number;
    english: string;
    turkish: string;
    status: WordListItem['status'];
    is_favorite: number | null;
  }>(
    `
      SELECT
        w.id,
        w.english,
        w.turkish,
        p.status,
        p.is_favorite
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      ${filterQuery.whereClause}
      ORDER BY w.english ASC
      LIMIT ?
      OFFSET ?
    `,
    ...filterQuery.params,
    query.limit,
    query.offset
  );
  const totalCount = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      ${filterQuery.whereClause}
    `,
    ...filterQuery.params
  );
  const totalWords = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const learnedCount = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE p.word_id IS NOT NULL AND p.status != 'new'
    `
  );
  const learningCount = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE status = 'learning'
        AND is_suspended = 0
    `
  );
  const reviewCount = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM word_progress
      WHERE status = 'review'
        AND is_suspended = 0
    `
  );
  const totalFilteredCount = totalCount?.count ?? 0;
  const nextOffset = query.offset + items.length < totalFilteredCount ? query.offset + items.length : null;

  return {
    items: items.map(mapWordListItem),
    totalCount: totalFilteredCount,
    totalWords: totalWords?.count ?? 0,
    learnedCount: learnedCount?.count ?? 0,
    learningCount: learningCount?.count ?? 0,
    reviewCount: reviewCount?.count ?? 0,
    nextOffset,
  };
}

export async function getLibraryReviewCandidatesRepository(limit = 20): Promise<WordCandidate[]> {
  const db = await getDatabase();
  const reviewRows = await getCandidatesByStatusOnDatabase(db, 'review', limit);
  const learningRows = await getCandidatesByStatusOnDatabase(
    db,
    'learning',
    Math.max(0, limit - reviewRows.length),
    reviewRows.map((row) => row.id)
  );
  const rows = [...reviewRows, ...learningRows];

  return rows.map((row) => ({
    id: row.id,
    english: row.english,
    turkish: row.turkish,
    sentences: sentencesFromRow(row),
  }));
}

export async function searchWordsRepository(query: string, limit = 20): Promise<WordListItem[]> {
  const db = await getDatabase();
  const normalized = `%${normalizeSearchText(query)}%`;
  const rows = await db.getAllAsync<{
    id: number;
    english: string;
    turkish: string;
    status: WordListItem['status'];
    is_favorite: number | null;
  }>(
    `
      SELECT w.id, w.english, w.turkish, p.status, p.is_favorite
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE w.normalized_english LIKE ?
         OR w.normalized_turkish LIKE ?
      ORDER BY w.english ASC
      LIMIT ?
    `,
    normalized,
    normalized,
    limit
  );

  return rows.map(mapWordListItem);
}

export async function getWordByIdRepository(wordId: number): Promise<WordDetail | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<
    WordListItem & {
      sentence1: string | null;
      sentence2: string | null;
      sentence3: string | null;
      sentence4: string | null;
      sentence5: string | null;
      seen_count: number | null;
      correct_count: number | null;
      wrong_count: number | null;
      last_seen_at: string | null;
      next_due_at: string | null;
      is_favorite: number | null;
      is_suspended: number | null;
    }
  >(
    `
      SELECT
        w.id,
        w.english,
        w.turkish,
        p.status,
        w.sentence1,
        w.sentence2,
        w.sentence3,
        w.sentence4,
        w.sentence5,
        p.seen_count,
        p.correct_count,
        p.wrong_count,
        p.last_seen_at,
        p.next_due_at,
        p.is_favorite,
        p.is_suspended
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE w.id = ?
    `,
    wordId
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    english: row.english,
    turkish: row.turkish,
    status: row.status ?? null,
    isFavorite: Boolean(row.is_favorite ?? 0),
    sentences: sentencesFromRow(row),
    seenCount: row.seen_count ?? 0,
    correctCount: row.correct_count ?? 0,
    wrongCount: row.wrong_count ?? 0,
    lastSeenAt: row.last_seen_at ?? null,
    nextDueAt: row.next_due_at ?? null,
    isSuspended: Boolean(row.is_suspended ?? 0),
  };
}

export async function getNewWordCandidatesRepository(limit: number): Promise<WordCandidate[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    english: string;
    turkish: string;
    sentence1: string | null;
    sentence2: string | null;
    sentence3: string | null;
    sentence4: string | null;
    sentence5: string | null;
  }>(
    `
      SELECT
        w.id,
        w.english,
        w.turkish,
        w.sentence1,
        w.sentence2,
        w.sentence3,
        w.sentence4,
        w.sentence5
      FROM words w
      LEFT JOIN word_progress p ON p.word_id = w.id
      WHERE (p.word_id IS NULL OR p.status = 'new')
        AND (p.is_suspended = 0 OR p.is_suspended IS NULL)
      ORDER BY RANDOM()
      LIMIT ?
    `,
    limit
  );

  return rows.map((row) => ({
    id: row.id,
    english: row.english,
    turkish: row.turkish,
    sentences: sentencesFromRow(row),
  }));
}
